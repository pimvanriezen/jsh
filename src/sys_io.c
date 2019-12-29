#include <stdio.h>
#include <string.h>
#include <stdbool.h>
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
#include <signal.h>
#include "duktape.h"
#include "sys_misc.h"
#include "textbuffer.h"

#ifdef __linux__
#include <sys/sysinfo.h>
#else
#include <sys/sysctl.h>
#endif
// ============================================================================
// FUNCTION sys_io_open
// ============================================================================
duk_ret_t sys_io_open (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    const char *spec = duk_to_string (ctx, 1);
    bool fl_read = false;
    bool fl_write = false;
    bool fl_append = false;
    bool fl_trunc = false;
    
    const char *c = spec;
    while (*c) {
        if (*c == 'r') fl_read = true;
        if (*c == 'w') fl_write = true;
        if (*c == 'a') fl_append = true;
        if (*c == 't') fl_trunc = true;
        c++;
    }
    
    int flags = 0;
    
    flags |= O_CREAT;
    if (fl_read && fl_write) {
        flags |= O_RDWR;
    }
    else if (fl_read) {
        flags |= O_RDONLY;
    }
    else if (fl_write) {
        flags |= O_WRONLY;
    }
    else {
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Invalid flags "
                               "for sys.open: need r or w");
        return duk_throw (ctx);
    }
    if (fl_append) flags |= O_APPEND;
    if (fl_trunc) flags |= O_TRUNC;
    
    int fd = open (path, flags);
    if (fd<0) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    duk_push_int (ctx, fd);
    return 1;
}

// ============================================================================
// FUNCTION sys_io_close
// ============================================================================
duk_ret_t sys_io_close (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int fd = duk_get_int (ctx, 0);
    if (fd<3) return 0;
    close (fd);
    return 0;
}

// ============================================================================
// FUNCTION sys_io_read
// ============================================================================
duk_ret_t sys_io_read (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int fd = duk_get_int (ctx, 0);
    int wantsz = duk_get_int (ctx, 1);
    int gotsz = 0;
    char *tbuf = malloc (wantsz+1);
    gotsz = read (fd, tbuf, wantsz);
    if (gotsz < 0) {
        return 0;
    }
    void *buf = duk_push_buffer (ctx, gotsz, 0);
    memcpy (buf, tbuf, gotsz);
    free (tbuf);
    return 1;
}

// ============================================================================
// FUNCTION sys_io_write
// ============================================================================
duk_ret_t sys_io_write (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int fd = duk_get_int (ctx, 0);
    void *buf = NULL;
    size_t bufsz = 0;
    int writesz = 0;
    
    buf = duk_get_buffer_data (ctx, 1, &bufsz);
    if (! buf) return DUK_RET_TYPE_ERROR;
    
    writesz = write (fd, buf, bufsz);
    if (writesz != bufsz) {
        duk_push_boolean (ctx, 0);
    }
    else {
        duk_push_boolean (ctx, 1);
    }
    return 1;
}

// ============================================================================
// STRUCT fdref
// ------------
// Keeps an association between a filedescriptor and its place in one of the
// arguments to sys.io.select().
// ============================================================================
struct fdref {
    struct fdref    *next;
    int              fd;
    int              refid;
};

typedef struct fdref *fdref_ptr;

// ============================================================================
// FUNCTION fdref_init
// ============================================================================
void fdref_init (struct fdref **baseptr) {
    *baseptr = NULL;
}

// ============================================================================
// FUNCTION fdref_add
// ============================================================================
fdref_ptr fdref_add (fdref_ptr *baseptr, int fd, int refid) {
    fdref_ptr res = malloc (sizeof (struct fdref));
    fdref_ptr crsr;
    
    res->next = NULL;
    res->fd = fd;
    res->refid = refid;
    
    if (! *baseptr) {
        *baseptr = res;
        return res;
    }
    
    crsr = *baseptr;
    while (crsr->next) crsr = crsr->next;
    crsr->next = res;
    return res;
}

// ============================================================================
// FUNCTION fdref_get_refid
// ============================================================================
int fdref_get_refid (fdref_ptr *baseptr, int fd) {
    fdref_ptr crsr = *baseptr;
    while (crsr) {
        if (crsr->fd == fd) return crsr->refid;
        crsr = crsr->next;
    }
    return -1;
}

// ============================================================================
// FUNCTION fdref_free
// ============================================================================
void fdref_free (fdref_ptr *baseptr) {
    fdref_ptr crsr, ncrsr;
    if (! baseptr) return;
    crsr = *baseptr;
    while (crsr) {
        ncrsr = crsr->next;
        free (crsr);
        crsr = ncrsr;
    }
    *baseptr = NULL;
}

// ============================================================================
// FUNCTION duk_get_fd
// -------------------
// Given a duktape function context, take the argument at argidx, and get
// the element within at position arrayidx (if arrayidx is 0, the argument
// is taken to be an array of length 1 with that argument as its only
// member). If the resolved positional argument is a number, return this
// as a filedescriptor. If it is an object, get a member called "fd" and
// return that as a filedescriptor. In failing cases, return 1.
// ============================================================================
int duk_get_fd (duk_context *ctx, int argidx, int arrayidx) {
    int popcnt = 0;
    int res = -1;
    if (! duk_is_array (ctx, argidx)) {
        fprintf (stderr, "getfd: notarray(%i)\n",arrayidx);
        if (arrayidx != 0) return -1;
        duk_dup (ctx, argidx);
        popcnt++;
    }
    else {
        fprintf (stderr, "getfd: isarray\n");
        duk_get_prop_index (ctx, argidx, arrayidx);
        popcnt++;
    }
    if (duk_is_object (ctx, -1)) {
        fprintf (stderr, "getfd: isobject\n");
        duk_get_prop_string (ctx, -1, "fd");
        popcnt++;
    }
    if (duk_is_number (ctx, -1)) {
        fprintf (stderr, "getfd: isnumber\n");
        res = duk_get_int (ctx, -1);
        fprintf (stderr, "     : => %i\n", res);
    }
    for (int i=0; i<popcnt; ++i) duk_pop (ctx);
    return res;
}

// ============================================================================
// FUNCTION duk_get_fdarg_len
// --------------------------
// Given the context described above in duk_get_fd, figure out how many
// elements are available for the argument at argidx.
// ============================================================================
int duk_get_fdarg_len (duk_context *ctx, int argidx) {
    int res = 0;
    if (! duk_is_array (ctx, argidx)) {
        if (duk_is_null (ctx, argidx)) return 0;
        return 1;
    }
    duk_get_prop_string (ctx, argidx, "length");
    res = duk_get_int (ctx, -1);
    duk_pop (ctx);
    return res;
}

// ============================================================================
// FUNCTION duk_push_fdarg
// -----------------------
// We were provided objects or numbers in the arguments to sys.io.select.
// Rather than spitting back just plain fds, match it back to the object
// provided in the arguments, whatever it may be.
//
// Assumes the top of the stack contains an array consisting of (argidx)
// elements, themselves being array.
// ============================================================================
void duk_push_fdarg (duk_context *ctx, int argidx, int arrayidx) {
    int offs = 0;
    
    if (! duk_is_array (ctx, -1)) return;
    duk_get_prop_index (ctx, -1, argidx);
    
    duk_get_prop_string (ctx, -1, "length");
    offs = duk_get_int (ctx, -1);
    duk_pop(ctx);
    
    if (! duk_is_array (ctx, argidx)) {
        if (arrayidx != 0) return;
        duk_dup (ctx, argidx);
    }
    else {
        duk_get_prop_index (ctx, argidx, arrayidx);
    }
    duk_put_prop_index (ctx, -2, offs);
    duk_pop (ctx); 
}

// ============================================================================

// ============================================================================
duk_ret_t sys_io_select (duk_context *ctx) {
    if (duk_get_top (ctx) < 3) return DUK_RET_TYPE_ERROR;
    
    int i = 0;
    int ai = 0;
    int maxfd = 0;
    int timeout_ms = 0;
    fdref_ptr sets[3];
    fd_set fds[3];
    int numfd[3];
    struct timeval tv;
    
    fdref_init (&sets[0]);
    fdref_init (&sets[1]);
    fdref_init (&sets[2]);
    
    if (duk_get_top (ctx) > 3) {
        timeout_ms = duk_get_int (ctx, 3);
        tv.tv_sec = timeout_ms/1000;
        tv.tv_usec = 1000 * (timeout_ms % 1000);
    }
    else {
        tv.tv_sec = 0;
        tv.tv_usec = 0;
    }
    
    for (i=0; i<3; ++i) {
        FD_ZERO (&fds[i]);
        numfd[i] = duk_get_fdarg_len (ctx, i);
        fprintf (stderr,"numfd(%i) = %i\n", i, numfd[i]);
        for (ai=0; ai<numfd[i]; ++ai) {
            int infd = duk_get_fd (ctx, i, ai);
            if (infd>0) {
                fprintf (stderr, "foundfd(%i,%i) = %i\n", i, ai, infd);
                fdref_add (&sets[i], infd, ai);
                FD_SET (infd, &fds[i]);
                if (infd > maxfd) maxfd = infd;
            }
        }
    }
    
    duk_push_array (ctx); // result array[3]
    duk_push_array (ctx);
    duk_put_prop_index (ctx, -2, 0);
    duk_push_array (ctx);
    duk_put_prop_index (ctx, -2, 1);
    duk_push_array (ctx);
    duk_put_prop_index (ctx, -2, 2);
    
    if (select (maxfd+1, &fds[0], &fds[1], &fds[2], &tv) > 0) {
        for (i=0; i<3; ++i) {
            for (ai=0; ai<numfd[i]; ++ai) {
                int posfd = duk_get_fd (ctx, i, ai);
                fprintf (stderr, "select.addfd(%i,%i) = %i\n",i,ai,posfd);
                if (posfd>0 && FD_ISSET(posfd, &fds[i])) {
                    duk_push_fdarg (ctx, i, ai);
                }
            }
        }
    }
    
    fdref_free (&sets[0]);
    fdref_free (&sets[1]);
    fdref_free (&sets[2]);
    return 1;
}
