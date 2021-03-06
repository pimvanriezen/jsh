// ============================================================================
// Command line shell implementation, freely after duk_cmdline.c
// ============================================================================

/* Helper define to enable a feature set; can also use separate defines. */
#if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || \
    defined(WIN64) || defined(_WIN64) || defined(__WIN64__)
/* Suppress warnings about plain fopen() etc. */
#define _CRT_SECURE_NO_WARNINGS
#if defined(_MSC_VER) && (_MSC_VER < 1900)
/* Workaround for snprintf() missing in older MSVC versions.
 * Note that _snprintf() may not NUL terminate the string, but
 * this difference does not matter here as a NUL terminator is
 * always explicitly added.
 */
#define snprintf _snprintf
#endif
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include <sys/errno.h>
#include "linenoise.h"
#include <stdint.h>  /* Assume C99/C++11 with linenoise. */
#include "duk_console.h"
#include "duk_module_duktape.h"
#include "duktape.h"
#include "preprocessor.h"
#include "textbuffer.h"
#include "version.h"

extern void sys_init (void);
extern void sys_init_heap (duk_context *, const char *);

#define  MEM_LIMIT_NORMAL   (128*1024*1024)   /* 128 MB */
#define  MEM_LIMIT_HIGH     (2047*1024*1024)  /* ~2 GB */
#define  LINEBUF_SIZE       65536

int main_argc = 0;
char **main_argv = NULL;
static int interactive_mode = 0;
static int allow_bytecode = 0;
static int no_auto_complete = 0;

int duk_cmdline_stack_check(void);

// ============================================================================
// FUNCTION print_greet_line
// ============================================================================
static void print_greet_line(void) {
    printf ("JSH version %s (%s)\n"
            "Copyright (c) 2020 Midilab\n"
            "Available under the GNU GPL v2\n\n"
            "Type \033[1mhelp()\033[0m for a list of commands.\n",
            JSH_VERSION, JSH_PLATFORM);
}

// ============================================================================
// FUNCTION set_resource_limits
// ----------------------------
// This was available in the duktape cli, haven't had the heart to rip it
// out yet, could be useful.
// ============================================================================
static void set_resource_limits(rlim_t mem_limit_value) {
    int rc;
    struct rlimit lim;

    rc = getrlimit(RLIMIT_AS, &lim);
    if (rc != 0) {
        fprintf(stderr, "Warning: cannot read RLIMIT_AS\n");
        return;
    }

    if (lim.rlim_max < mem_limit_value) {
        fprintf(stderr, "Warning: rlim_max < mem_limit_value (%d < %d)\n",
                        (int) lim.rlim_max, (int) mem_limit_value);
        return;
    }

    lim.rlim_cur = mem_limit_value;
    lim.rlim_max = mem_limit_value;

    rc = setrlimit(RLIMIT_AS, &lim);
    if (rc != 0) {
        fprintf(stderr, "Warning: setrlimit failed\n");
        return;
    }
}

// ============================================================================
// FUNCTION my_sighandler
// ----------------------
// Inherited from Duktape cli. Not sure if there's anything better we can
// do with this, until we hook deeper into the parser for allowing timed
// events, and perhaps even interrupts, to propagate.
// ============================================================================
static void my_sighandler(int x) {
    fprintf(stderr, "Got signal %d\n", x);
    fflush(stderr);
}

// ============================================================================
// FUNCTION set_sigint_handler
// ============================================================================
static void set_sigint_handler(void) {
    (void) signal(SIGINT, my_sighandler);
    (void) signal(SIGPIPE, SIG_IGN);  /* avoid SIGPIPE killing process */
}

// ============================================================================
// FUNCTION cmdline_fatal_handler
// ------------------------------
// The Duktape version would abort() and print a nastygram. Made it a bit
// less drastic.
// ============================================================================
static void cmdline_fatal_handler(void *udata, const char *msg) {
    (void) udata;
    fprintf(stderr, "%% Fatal error: %s\n", msg ? msg : "no message");
    fflush(stderr);
    exit (1);
}

// ============================================================================
// FUNCTION print_pop_error
// ------------------------
// Print an error to the provided FILE, and pop it off the stack.
// ============================================================================
static void print_pop_error(duk_context *ctx, FILE *f) {
    const char *trace = duk_safe_to_stacktrace(ctx, -1);
    struct textbuffer *tb = textbuffer_alloc();
    const char *crsr = trace;
    while (*crsr) {
        if (memcmp (crsr, "preventsyield", 13) == 0) crsr += 13;
        else {
            textbuffer_add_c (tb, *crsr);
            crsr++;
        }
    }
    textbuffer_add_c (tb, '\0');
    fprintf(f, "%% %s\n", tb->alloc);
    fflush(f);
    duk_pop(ctx);
    textbuffer_free (tb);
}

// ============================================================================
// FUNCTION wrapped_compile_execute
// ============================================================================
duk_ret_t wrapped_compile_execute(duk_context *ctx, void *udata) {
    const char *src_data;
    duk_size_t src_len;
    duk_uint_t comp_flags;

    (void) udata;

    /* [ ... bytecode_filename src_data src_len filename ] */

    src_data = (const char *) duk_require_pointer(ctx, -3);
    src_len = (duk_size_t) duk_require_uint(ctx, -2);

    if (src_data != NULL && src_len >= 1 && src_data[0] == (char) 0xbf) {
        /* Bytecode. */
        if (allow_bytecode) {
            void *buf;
            buf = duk_push_fixed_buffer(ctx, src_len);
            memcpy(buf, (const void *) src_data, src_len);
            duk_load_function(ctx);
        } else {
            (void) duk_type_error(ctx, "bytecode input rejected (use -b to "
                                       "allow bytecode inputs)");
        }
    } else {
        /* Source code. */
        comp_flags = DUK_COMPILE_SHEBANG;
        duk_compile_lstring_filename(ctx, comp_flags, src_data, src_len);
    }

    /* [ ... bytecode_filename src_data src_len function ] */

    /* Optional bytecode dump. */
    if (duk_is_string(ctx, -4)) {
        FILE *f;
        void *bc_ptr;
        duk_size_t bc_len;
        size_t wrote;
        char fnbuf[256];
        const char *filename;

        duk_dup_top(ctx);
        duk_dump_function(ctx);
        bc_ptr = duk_require_buffer_data(ctx, -1, &bc_len);
        filename = duk_require_string(ctx, -5);
        snprintf(fnbuf, sizeof(fnbuf), "%s", filename);
        fnbuf[sizeof(fnbuf) - 1] = (char) 0;

        f = fopen(fnbuf, "wb");
        if (!f) {
            (void) duk_generic_error(ctx, "failed to open bytecode "
                                          "output file");
        }
        wrote = fwrite(bc_ptr, 1, (size_t) bc_len, f);
        (void) fclose(f);
        if (wrote != bc_len) {
            (void) duk_generic_error(ctx, "failed to write all bytecode");
        }

        return 0;  /* duk_safe_call() cleans up */
    }

    duk_push_global_object(ctx);  /* 'this' binding */
    duk_call_method(ctx, 0);

    if (interactive_mode) {
        if (! duk_is_undefined(ctx, -1)) {
            duk_push_global_object(ctx);
            duk_get_prop_string(ctx, -1, "jshFormat");
            duk_dup(ctx, -3);
            duk_call(ctx, 1);  /* -> [ ... res stash formatted ] */
            fprintf(stdout, "= %s\n", duk_to_string(ctx, -1));
        }
        fflush(stdout);
    } else {
        /* In non-interactive mode, success results are not written at all.
         * It is important that the result value is not string coerced,
         * as the string coercion may cause an error in some cases.
         */
    }

    return 0;  /* duk_safe_call() cleans up */
}

// ============================================================================
// DATA Linenoise-related data
// ---------------------------
// Partially inherited from Duktape-cli. Amended to do file-based autocomplete
// within quoted strings, and to allow for the Class::method prototype
// notation, and to get the Object default properties out of the autocomplete
// list, since those are rarely needed and clutter up the namespace.
// ============================================================================
static duk_context *completion_ctx;

static const char *linenoise_completion_script =
    "(function linenoiseCompletion(input, addCompletion) {\n"
    "    // Find maximal trailing string which looks like a property\n"
    "    // access.  Look up all the components (starting from the global\n"
    "    // object now) except the last; treat the last component as a\n"
    "    // partial name and use it as a filter for possible properties.\n"
    "    var match, propseq, obj, i, partial, names, name, sanity;\n"
    "    var notnames;\n"
    "\n"
    "    if (!input) { return; }\n"
    "\n"
    "    var quotesplit = input.split(/['\"]/);\n"
    "    if ((quotesplit.length & 1) == 0) {\n"
    "        var pth = quotesplit[quotesplit.length-1];\n"
    "        var partial = input.substr (0,input.length - pth.length);\n"
    "        if (pth == \"\") return;\n"
    "        if (pth.indexOf ('*') >= 0) return;\n"
    "        var options = sys.glob (pth+'*');\n"
    "        if (! options.length) return;\n"
    "        var res = [];\n"
    "        for (var i=0; i<options.length;++i) {\n"
    "            var opt = options[i];\n"
    "            if (stat(opt).isDir) opt += '/';\n"
    "            addCompletion (partial+opt);\n"
    "        }\n"
    "        return;\n"
    "    }\n"
    "\n"
    "    match = /^.*?((?:\\w+(\\.|::))*\\w*)$/.exec(input);\n"
    "    if (!match || !match[1]) { return; }\n"
    "    var propseq = match[1].replace('::','.prototype.').split('.');\n"
    "\n"
    "    obj = Function('return this')();\n"
    "    for (i = 0; i < propseq.length - 1; i++) {\n"
    "        if (obj === void 0 || obj === null) { return; }\n"
    "        obj = obj[propseq[i]];\n"
    "    }\n"
    "    if (obj === void 0 || obj === null) { return; }\n"
    "\n"
    "    partial = propseq[propseq.length - 1];\n"
    "    sanity = 1000;\n"
    "    while (obj != null) {\n"
    "      if (--sanity < 0) { throw new Error('sanity'); }\n"
    "      names = Object.getOwnPropertyNames(Object(obj));\n"
    "      notnames = Object.getOwnPropertyNames(Object.prototype);\n"
    "      if (obj.app && obj.app.path && obj.app.version) {\n"
    "          notnames.intern (['fileName','app','length','prototype']);\n"
    "      }\n"
    "      for (i=0; i<notnames.length;++i) names.remove(notnames[i]);\n"
    "      for (i = 0; i < names.length; i++) {\n"
    "        if (--sanity < 0) { throw new Error('sanity'); }\n"
    "        name = names[i];\n"
    "        if (Number(name) >= 0) { continue; }  // ignore array keys\n"
    "        if (name.substring(0, partial.length) !== partial) { continue; }\n"
    "        if (name === partial) { addCompletion(input + '.'); continue; }\n"
    "        addCompletion(input + name.substring(partial.length));\n"
    "      }\n"
    "      obj = Object.getPrototypeOf(Object(obj));\n"
    "    }\n"
    "})\n";

static const char *linenoise_hints_script =
    "(function linenoiseHints(input) {\n"
    "    // Similar to completions but different handling for final results.\n"
    "    var match, propseq, obj, i, partial, names, name, res, found;\n"
    "    var first, sanity, notnames;\n"
    "\n"
    "    if (!input) { return; }\n"
    "    \n"
    "    var quotesplit = input.split(/['\"]/);\n"
    "    if ((quotesplit.length & 1) == 0) {\n"
    "        var pth = quotesplit[quotesplit.length-1];\n"
    "        if (pth == \"\") return;\n"
    "        if (pth.endsWith ('/')) return;\n"
    "        if (pth.indexOf ('*') >= 0) return;\n"
    "        var options = sys.glob (pth+'*');\n"
    "        if (! options.length) return;\n"
    "        var res = [];\n"
    "        for (var i=0; i<options.length;++i) {\n"
    "            var suffix='';\n"
    "            var opt = options[i];\n"
    "            if (stat(opt).isDir) suffix = '/';\n"
    "            if (! i) {\n"
    "                res.push (opt.substr(pth.length)+suffix);\n"
    "            }\n"
    "            else res.push (opt.replace(/.*\\//,'')+suffix);\n"
    "        }\n"
    "        return { hints: res.join(' | '), color: 2 };\n"
    "    }\n"
    "    \n"
    "    match = /^.*?((?:\\w+(\\.|::))*\\w*)$/.exec(input);\n"
    "    if (!match || !match[1]) { return; }\n"
    "    var propseq = match[1].replace('::','.prototype.').split('.');\n"
    "\n"
    "    obj = Function('return this')();\n"
    "    for (i = 0; i < propseq.length - 1; i++) {\n"
    "        if (obj === void 0 || obj === null) { return; }\n"
    "        obj = obj[propseq[i]];\n"
    "    }\n"
    "    if (obj === void 0 || obj === null) { return; }\n"
    "\n"
    "    partial = propseq[propseq.length - 1];\n"
    "    res = [];\n"
    "    found = Object.create(null);  // keys already handled\n"
    "    sanity = 1000;\n"
    "    while (obj != null) {\n"
    "        if (--sanity < 0) { throw new Error('sanity'); }\n"
    "        names = Object.getOwnPropertyNames(Object(obj));\n"
    "        notnames = Object.getOwnPropertyNames(Object.prototype);\n"
    "        if (obj.app && obj.app.path && obj.app.version) {\n"
    "            notnames.intern (['fileName','app','length','prototype']);\n"
    "        }\n"
    "        for (i=0; i<notnames.length;++i) names.remove(notnames[i]);\n"
    "        first = true;\n"
    "        for (i = 0; i < names.length; i++) {\n"
    "            if (--sanity < 0) { throw new Error('sanity'); }\n"
    "            name = names[i];\n"
    "            if (Number(name) >= 0) { continue; }  // ignore array keys\n"
    "            if (name.substring(0, partial.length) !== partial) {\n"
    "                continue;\n"
    "            }\n"
    "            if (name === partial) { continue; }\n"
    "            if (found[name]) { continue; }\n"
    "            found[name] = true;\n"
    "            res.push(res.length === 0 ? name.substring(partial.length) :"
                                        " (first ? ' || ' : ' | ') + name);\n"
    "            first = false;\n"
    "        }\n"
    "        obj = Object.getPrototypeOf(Object(obj));\n"
    "    }\n"
    "    return { hints: res.join(''), color: 35, bold: 1 };\n"
    "})\n";
    
// ============================================================================
// FUNCTION linenoise_add_completion
// ============================================================================
static duk_ret_t linenoise_add_completion(duk_context *ctx) {
    linenoiseCompletions *lc;

    duk_push_current_function(ctx);
    duk_get_prop_string(ctx, -1, "lc");
    lc = duk_require_pointer(ctx, -1);

    linenoiseAddCompletion(lc, duk_require_string(ctx, 0));
    return 0;
}

// ============================================================================
// FUNCTION linenoise_hints
// ============================================================================
static char *linenoise_hints(const char *buf, int *color, int *bold) {
    duk_context *ctx;
    duk_int_t rc;

    ctx = completion_ctx;
    if (!ctx) {
        return NULL;
    }

    duk_push_global_stash(ctx);
    duk_get_prop_string(ctx, -1, "linenoiseHints");
    if (!buf) {
        duk_push_undefined(ctx);
    } else {
        duk_push_string(ctx, buf);
    }

    rc = duk_pcall(ctx, 1 /*nargs*/);  /* [ stash func ] -> [ stash result ] */
    if (rc != 0) {
        char *res;
        const char *tmp = duk_safe_to_string(ctx,-1);
        res = malloc(strlen(tmp)+1);
        strcpy (res, tmp);
        *color = 31;  /* red */
        *bold = 1;
        duk_pop_2(ctx);
        return (char *) (uintptr_t) res; 
        /* uintptr_t cast to avoid const discard warning. */
    }

    if (duk_is_object(ctx, -1)) {
        const char *tmp;
        char *res = NULL;

        duk_get_prop_string(ctx, -1, "hints");
        tmp = duk_get_string(ctx, -1);
        if (tmp) {
            res = malloc(strlen(tmp)+1);
            strcpy (res, tmp);
        }
        duk_pop(ctx);

        duk_get_prop_string(ctx, -1, "color");
        *color = duk_to_int(ctx, -1);
        duk_pop(ctx);

        duk_get_prop_string(ctx, -1, "bold");
        *bold = duk_to_int(ctx, -1);
        duk_pop(ctx);

        duk_pop_2(ctx);
        return (char *) (uintptr_t) res; 
        /* uintptr_t cast to avoid const discard warning. */
    }

    duk_pop_2(ctx);
    return NULL;
}

// ============================================================================
// FUNCTION linenoise_freehints
// ============================================================================
static void linenoise_freehints(void *ptr) {
    free(ptr);
}

// ============================================================================
// FUNCTION linenoise_completion
// ============================================================================
static void linenoise_completion(const char *buf, linenoiseCompletions *lc) {
    duk_context *ctx;
    duk_int_t rc;

    ctx = completion_ctx;
    if (!ctx) {
        return;
    }

    duk_push_global_stash(ctx);
    duk_get_prop_string(ctx, -1, "linenoiseCompletion");

    if (!buf) {
        duk_push_undefined(ctx);
    } else {
        duk_push_string(ctx, buf);
    }
    duk_push_c_function(ctx, linenoise_add_completion, 2 /*nargs*/);
    duk_push_pointer(ctx, (void *) lc);
    duk_put_prop_string(ctx, -2, "lc");

    rc = duk_pcall(ctx, 2 /*nargs*/);  
    /* [ stash func callback ] -> [ stash result ] */
    if (rc != 0) {
        linenoiseAddCompletion(lc, duk_safe_to_string(ctx, -1));
    }
    duk_pop_2(ctx);
}

// ============================================================================
// FUNCTION handle_fh
// ============================================================================
static int handle_fh(duk_context *ctx, FILE *f, char *argv[], 
                     int argc, const char *filename, 
                     const char *bytecode_filename) {
    int rc;
    int retval = -1;
    duk_idx_t arr_idx;
    
    duk_push_global_object (ctx);
    duk_push_string (ctx, "argv");
    arr_idx = duk_push_array (ctx);
    duk_push_string (ctx, filename);
    duk_put_prop_index (ctx, arr_idx, 0);
    
    for (int ii=0; ii<argc; ++ii) {
        duk_push_string (ctx, argv[ii]);
        duk_put_prop_index (ctx, arr_idx, 1+ii);
    }
    
    duk_def_prop (ctx, -3, DUK_DEFPROP_HAVE_VALUE |
                           DUK_DEFPROP_SET_WRITABLE | 
                           DUK_DEFPROP_SET_CONFIGURABLE);
    duk_pop (ctx);

    struct textbuffer *t = textbuffer_load_fd(fileno (f));

    char *bufptr = t->alloc;
    if (bufptr[0] == '#' && bufptr[1] == '!') {
        bufptr = strchr (bufptr, '\n');
    }
    
    char *translated = preprocess (t->alloc);
    textbuffer_free (t);

    duk_push_string(ctx, bytecode_filename);
    duk_push_pointer(ctx, (void *) translated);
    duk_push_uint(ctx, (duk_uint_t) strlen (translated));
    duk_push_string(ctx, filename);

    interactive_mode = 0;  /* global */

    rc = duk_safe_call(ctx, wrapped_compile_execute, NULL, 4, 1);

    free(translated);

    if (rc != DUK_EXEC_SUCCESS) {
        print_pop_error(ctx, stderr);
        goto error;
    } else {
        duk_pop(ctx);
        retval = 0;
    }
    /* fall thru */

 cleanup:
    return retval;

 error:
    fprintf(stderr, "%% Error in executing file %s\n", filename);
    fflush(stderr);
    goto cleanup;
}

// ============================================================================
// FUNCTION handle_file
// ============================================================================
static int handle_file(duk_context *ctx, const char *filename,
                       char *argv[], int argc,
                       const char *bytecode_filename) {
    FILE *f = NULL;
    int retval;
    char fnbuf[256];

    /* Example of sending an application specific debugger notification. */
    duk_push_string(ctx, "DebuggerHandleFile");
    duk_push_string(ctx, filename);
    duk_debugger_notify(ctx, 2);

    snprintf(fnbuf, sizeof(fnbuf), "%s", filename);
    fnbuf[sizeof(fnbuf) - 1] = (char) 0;

    f = fopen(fnbuf, "rb");
    if (!f) {
        fprintf(stderr, "%% Failed to open source file: %s\n", filename);
        fflush(stderr);
        goto error;
    }

    retval = handle_fh(ctx, f, argv, argc, filename, bytecode_filename);

    fclose(f);
    return retval;

 error:
    return -1;
}

// ============================================================================
// FUNCTION handle_eval
// ============================================================================
static int handle_eval(duk_context *ctx, char *code) {
    int rc;
    int retval = -1;

    duk_push_pointer(ctx, (void *) code);
    duk_push_uint(ctx, (duk_uint_t) strlen(code));
    duk_push_string(ctx, "eval");

    interactive_mode = 0;  /* global */

    rc = duk_safe_call(ctx, wrapped_compile_execute, NULL, 3, 1);

    if (rc != DUK_EXEC_SUCCESS) {
        print_pop_error(ctx, stderr);
    } else {
        duk_pop(ctx);
        retval = 0;
    }

    return retval;
}

// ============================================================================
// FUNCTION handle_interactive
// ============================================================================
static int handle_interactive(duk_context *ctx) {
    const char *prompt = "jsh> ";
    char *buffer = NULL;
    int retval = 0;
    int rc;

    linenoiseSetMultiLine(1);
    linenoiseHistorySetMaxLen(64);
    if (!no_auto_complete) {
        linenoiseSetCompletionCallback(linenoise_completion);
        linenoiseSetHintsCallback(linenoise_hints);
        linenoiseSetFreeHintsCallback(linenoise_freehints);
        duk_push_global_stash(ctx);
        duk_eval_string(ctx, linenoise_completion_script);
        duk_put_prop_string(ctx, -2, "linenoiseCompletion");
        duk_eval_string(ctx, linenoise_hints_script);
        duk_put_prop_string(ctx, -2, "linenoiseHints");
        duk_pop(ctx);
    }

    for (;;) {
        if (buffer) {
            linenoiseFree(buffer);
            buffer = NULL;
        }
        
        duk_push_global_object(ctx);
        if (duk_has_prop_string (ctx, -1, "prompt")) {
            duk_push_string (ctx, "prompt");
            duk_call_prop (ctx, -2, 0);
            prompt = duk_get_string (ctx,-1);
        }
        else {
            duk_push_null (ctx);
        }
        
        completion_ctx = ctx;
        buffer = linenoise(prompt);
        completion_ctx = NULL;
        duk_pop (ctx);
        duk_pop (ctx);

        if (!buffer) {
            break;
        }

        if (buffer && buffer[0] != (char) 0) {
            linenoiseHistoryAdd(buffer);
        }
        
        char *translated = preprocess (buffer);

        duk_push_pointer(ctx, (void *) translated);
        duk_push_uint(ctx, (duk_uint_t) strlen(translated));
        duk_push_string(ctx, "input");

        interactive_mode = 1;  /* global */

        rc = duk_safe_call(ctx, wrapped_compile_execute, NULL, 3, 1);
        
        free (translated);
        if (buffer) {
            linenoiseFree(buffer);
            buffer = NULL;
        }

        if (rc != DUK_EXEC_SUCCESS) {
            /* in interactive mode, write to stdout */
            print_pop_error(ctx, stdout);
            retval = -1;  /* an error 'taints' the execution */
        } else {
            duk_pop(ctx);
        }
        duk_gc(ctx,0);
    }

    if (buffer) {
        linenoiseFree(buffer);
        buffer = NULL;
    }

    return retval;
}

/*
 *  Duktape heap lifecycle
 */

#define  ALLOC_DEFAULT  0
#define  ALLOC_LOGGING  1
#define  ALLOC_TORTURE  2
#define  ALLOC_HYBRID   3
#define  ALLOC_LOWMEM   4

// ============================================================================
// FUNCTION create_duktape_heap
// ============================================================================
static duk_context *create_duktape_heap(int alloc_provider,
                                        int debugger, int lowmem_log,
                                        int interactive) {
    duk_context *ctx;

    (void) lowmem_log;  /* suppress warning */

    ctx = NULL;
    ctx = duk_create_heap(NULL, NULL, NULL, NULL, cmdline_fatal_handler);

    if (!ctx) {
        fprintf(stderr, "Failed to create Duktape heap\n");
        fflush(stderr);
        exit(1);
    }

    /* Register console object. */
    duk_console_init(ctx, DUK_CONSOLE_FLUSH /*flags*/);

    /* Register require() (removed in Duktape 2.x). */
    duk_module_duktape_init(ctx);

    /* Stash a formatting function for evaluation results. */
    duk_push_global_object(ctx);
    duk_eval_string(ctx,
        "(function (E) {"
            "return function format(v){"
                "try{"
                    "return E('jx',v);"
                "}catch(e){"
                    "return ''+v;"
                "}"
            "};"
        "})(Duktape.enc)");
    duk_put_prop_string(ctx, -2, "jshFormat");
    duk_pop(ctx);

    preprocessor_init ();
    if (interactive) {
        preprocessor_define ("IS_INTERACTIVE","true");
    }

    sys_init ();
    sys_init_heap (ctx, interactive ? "interactive":"script");
    if (debugger) {
        fprintf(stderr, "Warning: option --debugger ignored, "
                        "no debugger support\n");
        fflush(stderr);
    }

    return ctx;
}

// ============================================================================
// FUNCTION destroy_duktape_heap
// ============================================================================
static void destroy_duktape_heap(duk_context *ctx, int alloc_provider) {
    (void) alloc_provider;

    if (ctx) {
        duk_destroy_heap(ctx);
    }
}

// ============================================================================
// FUNCTION main
// ============================================================================
int main(int argc, char *argv[]) {
    duk_context *ctx = NULL;
    int retval = 0;
    int have_files = 0;
    int have_eval = 0;
    int interactive = 0;
    int memlimit_high = 1;
    int alloc_provider = ALLOC_DEFAULT;
    int lowmem_log = 0;
    int debugger = 0;
    int no_heap_destroy = 0;
    int verbose = 0;
    int run_stdin = 0;
    const char *compile_filename = NULL;
    int i;
    
    main_argc = argc;
    main_argv = (char **) argv;

    (void) lowmem_log;

    /*
     *  Signal handling setup
     */

    set_sigint_handler();

    /* This is useful at the global level; libs should avoid SIGPIPE though */
    /*signal(SIGPIPE, SIG_IGN);*/

    /*
     *  Parse options
     */

    for (i = 1; i < argc; i++) {
        char *arg = argv[i];
        if (!arg) {
            goto usage;
        }
        else if (strcmp(arg, "-e") == 0) {
            have_eval = 1;
            if (i == argc - 1) {
                goto usage;
            }
            i++;  /* skip code */
        } else if (strcmp(arg, "--no-auto-complete") == 0) {
            no_auto_complete = 1;
        } else if (strcmp(arg, "--verbose") == 0) {
            verbose = 1;
        } else if (strcmp(arg, "--run-stdin") == 0) {
            run_stdin = 1;
        } else if (strlen(arg) >= 1 && arg[0] == '-') {
            goto usage;
        } else {
            have_files = 1;
        }
    }
    if (!have_files && !have_eval && !run_stdin) {
        interactive = 1;
    }

    /*
     *  Memory limit
     */

    set_resource_limits(memlimit_high ? MEM_LIMIT_HIGH : MEM_LIMIT_NORMAL);

    /*
     *  Create heap
     */

    ctx = create_duktape_heap(alloc_provider, debugger,
                              lowmem_log, interactive);

    /*
     *  Execute any argument file(s)
     */

    for (i = 1; i < argc; i++) {
        char *arg = argv[i];
        if (!arg) {
            continue;
        } else if (strlen(arg) == 2 && strcmp(arg, "-e") == 0) {
            /* Here we know the eval arg exists but check anyway */
            if (i == argc - 1) {
                retval = 1;
                goto cleanup;
            }
            if (handle_eval(ctx, argv[i + 1]) != 0) {
                retval = 1;
                goto cleanup;
            }
            i++;  /* skip code */
            continue;
        } else if (strlen(arg) == 2 && strcmp(arg, "-c") == 0) {
            i++;  /* skip filename */
            continue;
        } else if (strlen(arg) >= 1 && arg[0] == '-') {
            continue;
        }

        if (verbose) {
            fprintf(stderr, "*** Executing file: %s\n", arg);
            fflush(stderr);
        }

        if (handle_file(ctx, arg, argv+i+1, argc-i-1, compile_filename) != 0) {
            retval = 1;
        }
        
        goto cleanup;
    }

    if (run_stdin) {
        /* Running stdin like a full file (reading all lines before
         * compiling) is useful with emduk:
         * cat test.js | ./emduk --run-stdin
         */
        if (handle_fh(ctx, stdin, NULL, 0, "stdin", compile_filename) != 0) {
            retval = 1;
            goto cleanup;
        }
    }

    /*
     *  Enter interactive mode if options indicate it
     */

    if (interactive) {
        print_greet_line();
        if (handle_interactive(ctx) != 0) {
            retval = 1;
            goto cleanup;
        }
    }

    /*
     *  Cleanup and exit
     */

 cleanup:
    if (interactive) {
        fprintf(stderr, "Cleaning up...\n");
        fflush(stderr);
    }

    if (ctx && no_heap_destroy) {
        duk_gc(ctx, 0);
    }
    if (ctx && !no_heap_destroy) {
        destroy_duktape_heap(ctx, alloc_provider);
    }
    ctx = NULL;

    return retval;

    /*
     *  Usage
     */

 usage:
    fprintf(stderr, "Usage: jsh [options] [<filename> [arguments]]\n"
                    "\n"
                    "   -i                 enter interactive mode "
                                          "after executing argument file(s) "
                                          "/ eval code\n"
                    "   --no-auto-complete disable linenoise auto completion\n"
                    "\n"
                    "If <filename> is omitted, interactive mode is started "
                    "automatically.\n");
    fflush(stderr);
    exit(1);
}

int duk_cmdline_stack_check(void) {
    return 0;
}
