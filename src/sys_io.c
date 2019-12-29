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

duk_ret_t sys_io_close (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int fd = duk_get_int (ctx, 0);
    if (fd<3) return 0;
    close (fd);
    return 0;
}

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

