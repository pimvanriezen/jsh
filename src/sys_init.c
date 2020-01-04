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
#include "sugar.h"
#include "sys_channel.h"
#include "sys_fs.h"
#include "sys_run.h"
#include "sys_misc.h"
#include "sys_module.h"
#include "sys_io.h"
#include "sys_sock.h"
#include "sys_global.h"
#include "fd.h"
#include "dbsqlite.h"

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
// ============================================================================
void sys_init (void) {
    fd_init();
    sys_fs_init();
    sys_channel_init();
    sys_sock_init();
    global_init();
}

// ============================================================================
// FUNCTION sys_init_heap
// ----------------------
// Hooks into the Duktape heap with all the system functions.
//
// Finally, the path to global.js is resolved to bootstrap the system.
// ============================================================================
void sys_init_heap (duk_context *ctx) {
    const char *osglobal;

    duk_idx_t obj_idx;
    duk_idx_t chanobj_idx;
    duk_idx_t ioobj_idx;
    duk_idx_t sockobj_idx;
    duk_idx_t globalobj_idx;
    duk_idx_t sqlobj_idx;
    
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
    
    #define iocall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_io_##xxx, type); \
        duk_def_prop (ctx, ioobj_idx, PROPFLAGS);
    
    #define sockcall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_sock_##xxx, type); \
        duk_def_prop (ctx, sockobj_idx, PROPFLAGS);
    
    #define globalcall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_global_##xxx, type); \
        duk_def_prop (ctx, globalobj_idx, PROPFLAGS);
        
    #define sqlcall(xxx,type) \
        duk_push_string (ctx, #xxx); \
        duk_push_c_function (ctx, sys_sql_##xxx, type); \
        duk_def_prop (ctx, sqlobj_idx, PROPFLAGS);

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
    defcall (uptime, 0);
    defcall (loadavg, 0);
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
    defcall (getgrnam, 1);
    defcall (getgrgid, 1);
    defcall (getgroups, 0);
    defcall (hostname, DUK_VARARGS);
    defcall (winsize, 0);
    defcall (stat, 1);
    defcall (getuid, 0);
    defcall (getgid, 0);
    defcall (getpid, 0);
    defcall (uname, 0);
    defcall (go, 2);
    defcall (gethostbyname, 1);
    
    duk_push_string (ctx, "channel");
    chanobj_idx = duk_push_object (ctx);
    
    chancall (open, 0);
    chancall (send, 2);
    chancall (recv, 1);
    chancall (exit, 1);
    chancall (close, 1);
    chancall (stat, 0);
    chancall (available, 1);
    chancall (isempty, 1);
    chancall (senderror, 2);
    chancall (error, 1);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "io");
    ioobj_idx = duk_push_object (ctx);
    
    iocall (open, 2);
    iocall (close, 1);
    iocall (read, 2);
    iocall (write, 2);
    iocall (select, DUK_VARARGS);
    iocall (stat, 0);
    iocall (retain, 1);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "sock");
    sockobj_idx = duk_push_object (ctx);
    
    sockcall (tcp, DUK_VARARGS);
    sockcall (tcplisten, DUK_VARARGS);
    sockcall (accept, 1);
    sockcall (stat, 0);
    sockcall (unix, 1);
    sockcall (unixlisten, 1);
    sockcall (udp, 0);
    sockcall (udpbind, DUK_VARARGS);
    sockcall (send, 4);
    sockcall (recv, 1);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
    duk_push_string (ctx, "global");
    globalobj_idx = duk_push_object (ctx);
    globalcall (get, DUK_VARARGS);
    globalcall (set, 3);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
    
#ifdef WITH_SQLITE3
    duk_push_string (ctx, "sql");
    sqlobj_idx = duk_push_object (ctx);
    sqlcall (open, 1);
    sqlcall (close, 1);
    sqlcall (query, DUK_VARARGS);
    sqlcall (rowsaffected, 0);
    
    duk_def_prop (ctx, obj_idx, PROPFLAGS);
#endif
    
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
        char *tbuffer = handle_sugar (t->alloc);
        duk_get_global_string (ctx, "sys");
        duk_get_prop_string (ctx, -1, "_modules");
        duk_idx_t obj_idx = duk_push_object (ctx); // [ .. gl sys mo obj ]
        duk_push_string (ctx, osglobal);
        duk_put_prop_string (ctx, obj_idx, "fileName");
        duk_push_number (ctx, t->wpos);
        duk_put_prop_string (ctx, obj_idx, "size");
        duk_push_string (ctx, "bootstrap");
        duk_put_prop_string (ctx, obj_idx, "type");
        duk_eval_string(ctx, "Date");
        duk_pnew (ctx,0);
        duk_put_prop_string (ctx, obj_idx, "loadtime");
        duk_put_prop_string (ctx, -2, "__global__");
        duk_pop(ctx);
        duk_pop(ctx);

        duk_push_string (ctx, tbuffer);
        duk_eval_noresult (ctx);

        free (tbuffer);
        textbuffer_free (t);
    }
}
