#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <time.h>
#include <pwd.h>
#include <glob.h>
#include <fcntl.h>
#include <dirent.h>
#include <strings.h>
#include <grp.h>
#include <sys/stat.h>
#include <unistd.h>
#include <stdlib.h>
#include <sys/errno.h>
#include <sys/wait.h>
#include <strings.h>
#include <sys/ioctl.h>
#include <sys/utsname.h>
#include "duktape.h"
#include "textbuffer.h"
#include "sugar.h"
#include "sys_module.h"

// ============================================================================
// FUNCTION sys_modsearch
// ----------------------
// Module loader for the duktape 'require' call.
// ============================================================================
duk_ret_t sys_modsearch (duk_context *ctx) {
    struct stat st;
    const char *id = duk_to_string (ctx, 0);
    const char *path;
    
    // Resolve JSH_MODULE_PATH through the virtual env{} object, rather
    // than directly using getenv, allowing any provided defaults
    // to trickle into module loading.
    duk_push_global_object (ctx);
    duk_get_prop_string (ctx, -1, "env");
    duk_get_prop_string (ctx, -1, "JSH_MODULE_PATH");
    
    // Although the API turns this into a neat array, let's play dumb for
    // now and get back a regular PATH-style string delimited by colons.
    duk_push_string (ctx, "join");
    duk_push_string (ctx, ":");
    duk_call_prop (ctx, -3, 1);
    
    path = duk_get_string (ctx, -1);
    if (! path) path = "./modules";
    char *paths = strdup(path);
    
    // Clean up the stack
    duk_pop(ctx);
    duk_pop(ctx);
    duk_pop(ctx);
    duk_pop(ctx);
    
    // Go through the path, and try it on with our requested module name.
    char *pathp = paths;
    char *p;
    char *end;
    char *full = NULL;
    while (pathp) {
        p = strchr (pathp, ':');
        if (p) {
            *p = 0;
            p++;
        }
        
        full = (char *) malloc ((size_t) (strlen(pathp)+strlen(id)+16));

        strcpy (full, pathp);
        strcat (full, "/");
        strcat (full, id);
        if (! stat (full, &st)) {
            p = NULL;
            break;
        }
        else {
            // first try ${PATH}/${MODULENAME}.js
            end = full + strlen(full);
            strcpy (end, ".js");
            if (! stat (full, &st)) {
                p = NULL;
                break;
            }
            else {
                // ok no, try ${PATH}/${MODULENAME}/index.js
                strcpy (end, "/index.js");
                if (! stat (full, &st)) {
                    p = NULL;
                    break;
                }
            }
        }
        free (full);
        full = NULL;
        pathp = p;
    }

    free (paths);

    // If nothing was found, bitch and complain
    if (! full) {
        duk_push_string (ctx, "Could not resolve path");
        return duk_throw (ctx);
    }

    // Load the source code
    struct textbuffer *t = textbuffer_load(full);
    if (! t) return 0;

    // Translate syntax sugar, and push the result to the stack.
    char *translated = handle_sugar (t->alloc);
    duk_push_string (ctx, translated);
    free (translated);
    
    // Update sys._modules
    duk_get_global_string (ctx, "sys");
    duk_get_prop_string (ctx, -1, "_modules");
    duk_idx_t obj_idx = duk_push_object (ctx); // [ .. gl sys mo obj ]
    duk_push_string (ctx, full);
    duk_put_prop_string (ctx, obj_idx, "fileName");
    duk_push_number (ctx, t->wpos);
    duk_put_prop_string (ctx, obj_idx, "size");
    duk_push_string (ctx, "require");
    duk_put_prop_string (ctx, obj_idx, "type");
    duk_eval_string(ctx, "Date");
    duk_pnew (ctx,0);
    duk_put_prop_string (ctx, obj_idx, "loadtime");
    duk_put_prop_string (ctx, -2, id);
    duk_pop(ctx);
    duk_pop(ctx);
    
    textbuffer_free (t);
    free (full);
    return 1;
}

// ============================================================================
// FUNCTION sys_eval
// ============================================================================
duk_ret_t sys_eval (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    const char *src;
    const char *fname = "eval";
    char *translated;
    src = duk_to_string (ctx, 0);
    if (duk_get_top (ctx) > 1) fname = duk_to_string (ctx, 1);
    translated = handle_sugar (src);
    duk_push_string (ctx, fname);
    if (duk_pcompile_string_filename (ctx, 0, translated) != 0) {
        duk_push_error_object (ctx, DUK_ERR_TYPE_ERROR, "%s",
                               duk_safe_to_string (ctx,-1));
        return duk_throw(ctx);
    }
    duk_call (ctx, 0);
    free (translated);
    return 1;
}

// ============================================================================
// FUNCTION sys_parse
// ============================================================================
duk_ret_t sys_parse (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    const char *ctxnam = "parse";
    const char *fnam = duk_to_string (ctx, 0);
    const char *modnam = fnam;
    struct textbuffer *t = textbuffer_load (fnam);
    if (! t) {
        duk_push_boolean (ctx, 0);
        textbuffer_free (t);
    }
    else {
        if (duk_get_top(ctx) > 1) {
            ctxnam = duk_to_string (ctx, 1);
            if (duk_get_top(ctx) > 2) {
                modnam = duk_to_string (ctx, 2);
            }
        }
        char *translated = handle_sugar (t->alloc);
        duk_push_string (ctx, fnam);
        if (duk_pcompile_string_filename (ctx, 0, translated) != 0) {
            fprintf (stderr, "%% %s: %s\n",
                     fnam, duk_safe_to_string (ctx, -1));
            duk_pop (ctx);
            duk_push_boolean (ctx, 0);
        }
        else {
            duk_get_global_string (ctx, "sys");
            duk_get_prop_string (ctx, -1, "_modules");
            duk_idx_t obj_idx = duk_push_object (ctx); // [ .. gl sys mo obj ]
            duk_push_string (ctx, fnam);
            duk_put_prop_string (ctx, obj_idx, "fileName");
            duk_push_number (ctx, t->wpos);
            duk_put_prop_string (ctx, obj_idx, "size");
            duk_push_string (ctx, ctxnam);
            duk_put_prop_string (ctx, obj_idx, "type");
            duk_eval_string(ctx, "Date");
            duk_pnew (ctx,0);
            duk_put_prop_string (ctx, obj_idx, "loadtime");
            duk_put_prop_string (ctx, -2, modnam);
            duk_pop(ctx);
            duk_pop(ctx);
            duk_call (ctx, 0);
            duk_push_boolean (ctx, 1);
        }
        free (translated);
        textbuffer_free (t);
    }
    return 1;
}
