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
#include "sys_misc.h"
#include "textbuffer.h"

// ============================================================================
// FUNCTION sys_setenv
// ============================================================================
duk_ret_t sys_setenv (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *key = duk_to_string (ctx, 0);
    const char *value = duk_to_string (ctx, 1);
    
    setenv (key, value, 1);
    return 0;
}

// ============================================================================
// FUNCTION sys_getenv
// ============================================================================
duk_ret_t sys_getenv (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *key = duk_to_string (ctx, 0);
    const char *v = getenv (key);
    if (v) {
        duk_push_string (ctx, v);
        return 1;
    }
    return 0;
}

// ============================================================================
// FUNCTION sys_winsize
// ============================================================================
duk_ret_t sys_winsize (duk_context *ctx) {
    struct winsize ws;
    if (ioctl (0, TIOCGWINSZ, &ws) == 0) {
        duk_push_int (ctx, ws.ws_col);
    }
    else {
        duk_push_int (ctx, 80);
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_getuid
// ============================================================================
duk_ret_t sys_getuid (duk_context *ctx) {
    uid_t uid = getuid();
    duk_push_number (ctx, uid);
    return 1;
}

// ============================================================================
// FUNCTION sys_getgid
// ============================================================================
duk_ret_t sys_getgid (duk_context *ctx) {
    gid_t gid = getgid();
    duk_push_number (ctx, gid);
    return 1;
}

// ============================================================================
// FUNCTION sys_getpid
// ============================================================================
duk_ret_t sys_getpid (duk_context *ctx) {
    pid_t pid = getpid();
    duk_push_number (ctx, pid);
    return 1;
}

// ============================================================================
// FUNCTION sys_uname
// ============================================================================
duk_ret_t sys_uname (duk_context *ctx) {
    struct utsname name;
    uname (&name);
    duk_idx_t obj_idx = duk_push_object (ctx);
    duk_push_string (ctx, name.sysname);
    duk_put_prop_string (ctx, obj_idx, "sysname");
    duk_push_string (ctx, name.nodename);
    duk_put_prop_string (ctx, obj_idx, "nodename");
    duk_push_string (ctx, name.release);
    duk_put_prop_string (ctx, obj_idx, "release");
    duk_push_string (ctx, name.version);
    duk_put_prop_string (ctx, obj_idx, "version");
    duk_push_string (ctx, name.machine);
    duk_put_prop_string (ctx, obj_idx, "machine");
    return 1;
}

// ============================================================================
// DATA username/groupname cache for stat data
// ============================================================================
struct xidcache {
    unsigned int id;
    char name[64];
};

static struct xidcache uidcache[16];
static struct xidcache gidcache[16];
static int uidcpos;
static int gidcpos;

// ============================================================================
// FUNCTION sys_print
// ============================================================================
duk_ret_t sys_print (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    const char *data = duk_to_string (ctx, 0);
    write (1, data, strlen(data));
    return 0;
}

// ============================================================================
// FUNCTION pushpasswd
// -------------------
// Pushes an object onto the duktape stack with details from a passwd entry.
// ============================================================================
void pushpasswd (duk_context *ctx, struct passwd *pw) {
    duk_idx_t obj_idx = duk_push_object (ctx);
    duk_push_string (ctx, pw->pw_name);
    duk_put_prop_string (ctx, obj_idx, "name");
    duk_push_int (ctx, (int) pw->pw_uid);
    duk_put_prop_string (ctx, obj_idx, "uid");
    duk_push_int (ctx, (int) pw->pw_gid);
    duk_put_prop_string (ctx, obj_idx, "gid");
    duk_push_string (ctx, pw->pw_gecos);
    duk_put_prop_string (ctx, obj_idx, "gecos");
    duk_push_string (ctx, pw->pw_dir);
    duk_put_prop_string (ctx, obj_idx, "home");
    duk_push_string (ctx, pw->pw_shell);
    duk_put_prop_string (ctx, obj_idx, "shell");
}

// ============================================================================
// FUNCTION sys_getpwnam
// ============================================================================
duk_ret_t sys_getpwnam (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    const char *username = duk_to_string (ctx, 0);
    struct passwd *pw = getpwnam (username);
    if (! pw) return 0;
    pushpasswd (ctx, pw);
    return 1;
}

// ============================================================================
// FUNCTION sys_getpwuid
// ============================================================================
duk_ret_t sys_getpwuid (duk_context *ctx) {
    if (duk_get_top (ctx) == 0) return DUK_RET_TYPE_ERROR;
    uid_t uid = (uid_t) duk_get_int (ctx, 0);
    struct passwd *pw = getpwuid (uid);
    if (! pw) return 0;
    pushpasswd (ctx, pw);
    return 1;
}

// ============================================================================
// FUNCTION sys_hostname
// ============================================================================
duk_ret_t sys_hostname (duk_context *ctx) {
    char nm[256];
    if (duk_get_top (ctx) == 0) {
        nm[0] = nm[255] = 0;
        gethostname (nm, 255);
        duk_push_string (ctx, nm);
        return 1;
    }
    const char *newnm = duk_to_string (ctx, 0);
    if (sethostname (newnm, strlen(newnm)) == 0) {
        duk_push_boolean (ctx, 1);
    }
    else {
        duk_push_boolean (ctx, 0);
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_fs_init
// ============================================================================
void sys_fs_init (void) {
    bzero (uidcache, 16 * sizeof (struct xidcache));
    bzero (gidcache, 16 * sizeof (struct xidcache));
    uidcpos = gidcpos = 0;
}