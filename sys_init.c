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
#include "quoting.h"
#include "sys_channel.h"
#include "sys_fs.h"
#include "sys_run.h"
#include "sys_misc.h"
#include "sys_module.h"

// ============================================================================
// FUNCTION mystrdup
// ============================================================================
char *mystrdup (const char *orig) {
    size_t len = strlen (orig);
    char *res = (char *) malloc (len+1);
    strcpy (res, orig);
    return res;
}

// ============================================================================
// FUNCTION sys_init
// -----------------
// Initializes all global data, and hooks into the Duktape heap with all
// the system functions.
//
// Finally, the path to global.js is resolved to bootstrap the system.
// ============================================================================
void sys_init (duk_context *ctx) {
    const char *osglobal;

    sys_fs_init();
    sys_channel_init();

    duk_idx_t obj_idx;
    duk_idx_t chanobj_idx;
    
    #define PROPFLAGS DUK_DEFPROP_HAVE_VALUE | DUK_DEFPROP_SET_WRITABLE | \
            DUK_DEFPROP_SET_CONFIGURABLE
    
    #define defcall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_##xxx, type); \
        duk_def_prop (ctx, obj_idx, PROPFLAGS);
        
    #define chancall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_chan_##xxx, type); \
        duk_def_prop (ctx, chanobj_idx, PROPFLAGS);
    
    duk_push_global_object (ctx);
    duk_push_string (ctx, "sys");
    obj_idx = duk_push_object (ctx);
    
    duk_push_string (ctx, "_modules");
    duk_push_object (ctx);
    duk_def_prop (ctx, obj_idx, PROPFLAGS);

    defcall (cd, 1);
    defcall (cwd, 0);
    defcall (dir, DUK_VARARGS);
    defcall (eval, DUK_VARARGS);
    defcall (parse, DUK_VARARGS);
    defcall (glob, 1);
    defcall (getenv, 1);
    defcall (setenv, 2);
    defcall (print, DUK_VARARGS);
    defcall (kill, 2);
    defcall (read, DUK_VARARGS);
    defcall (write, 2);
    defcall (run, DUK_VARARGS);
    defcall (runconsole, 2);
    defcall (mkdir, DUK_VARARGS);
    defcall (chmod, 2);
    defcall (chown, 3);
    defcall (getpwnam, 1);
    defcall (getpwuid, 1);
    defcall (hostname, DUK_VARARGS);
    defcall (winsize, 0);
    defcall (stat, 1);
    defcall (getuid, 0);
    defcall (getgid, 0);
    defcall (getpid, 0);
    defcall (uname, 0);
    defcall (go, 2);
    
    duk_push_string (ctx, "channel");
    chanobj_idx = duk_push_object (ctx);
    
    chancall (open, 0);
    chancall (send, 2);
    chancall (recv, 1);
    chancall (exit, 1);
    chancall (close, 1);
    chancall (info, 0);
    chancall (available, 1);
    chancall (isempty, 1);
    chancall (senderror, 2);
    chancall (error, 1);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    duk_def_prop (ctx, -3, PROPFLAGS);
    duk_pop (ctx);
    
    duk_get_global_string (ctx, "Duktape");
    duk_push_c_function (ctx, sys_modsearch, 4);
    duk_put_prop_string (ctx, -2, "modSearch");
    duk_pop (ctx);
    
    struct textbuffer *t;
    
    osglobal = getenv("JSH_GLOBAL");
    if (osglobal) t = textbuffer_load (osglobal);
    else {
        osglobal = "/usr/lib/jsh/modules/global.js";
        t = textbuffer_load (osglobal);
        if (! t) {
            osglobal = "/usr/local/lib/jsh/modules/global.js";
            t = textbuffer_load (osglobal);
        }
    }

    if (t) {
        char *tbuffer = handle_quoting (t->alloc);
        duk_push_string (ctx, tbuffer);
        duk_eval_noresult (ctx);

        duk_get_global_string (ctx, "sys");
        duk_get_prop_string (ctx, -1, "_modules");
        duk_idx_t obj_idx = duk_push_object (ctx); // [ .. gl sys mo obj ]
        duk_push_string (ctx, osglobal);
        duk_put_prop_string (ctx, obj_idx, "fileName");
        duk_push_number (ctx, t->wpos);
        duk_put_prop_string (ctx, obj_idx, "size");
        duk_push_string (ctx, "bootstrap");
        duk_put_prop_string (ctx, obj_idx, "type");
        duk_put_prop_string (ctx, -2, "__global__");
        duk_pop(ctx);
        duk_pop(ctx);

        free (tbuffer);
        textbuffer_free (t);
    }
}
