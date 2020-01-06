#include <fcntl.h>
#include <sys/socket.h>
#include <unistd.h>
#include <string.h>
#include <stdlib.h>
#include "fd.h"

// ----------------------------------------------------------------------------
// Two tables holding bitfields to keep track of a set of file descriptors.
// The ultimate purpose of this is to have control over which file descriptors
// should remain open when performing a fork(). Note that in the case of
// jshttpd we're actually pretty shitty at this, with microhttpd doing its
// own thing with filedescriptors. This means coroutines and spawned commands
// currently inherit active http sockets.
// ----------------------------------------------------------------------------
unsigned char FDTABLE_open[(LIMIT_FDT_MAX) / 8];
unsigned char FDTABLE_retain[(LIMIT_FDT_MAX) / 8];

// ----------------------------------------------------------------------------
// Macros for setting/clearing/checking the bitfiels
// ----------------------------------------------------------------------------
#define FDT_SET(tt,xx) {FDTABLE_##tt[xx/8] |= (1 << (xx&7));}
#define FDT_CLR(tt,xx) {FDTABLE_##tt[xx/8] &= (0xff^(1 << (xx&7)));}
#define FDT_ISSET(tt,xx) (FDTABLE_##tt[xx/8] & (1 << (xx&7)))

// ============================================================================
// FUNCTION fd_init
// ============================================================================
void fd_init (void) {
    memset (&FDTABLE_open, 0, sizeof(FDTABLE_open));
    memset (&FDTABLE_retain, 0, sizeof(FDTABLE_retain));
    FDT_SET(open,0);
    FDT_SET(open,1);
    FDT_SET(open,2);
    FDT_SET(retain,0);
    FDT_SET(retain,1);
    FDT_SET(retain,2);
}

// ============================================================================
// FUNCTION fd_open
// ============================================================================
int fd_open (const char *path, int flags) {
    int res = open (path, flags);
    if (res >= LIMIT_FDT_MAX) abort();
    if (res>=0) FDT_SET(open,res);
    return res;
}

// ============================================================================
// FUNCTION fd_close
// ============================================================================
int fd_close (int fd) {
    int res = close(fd);
    if (res == 0) {
        if (fd < LIMIT_FDT_MAX) {
            FDT_CLR(open,fd);
            FDT_CLR(retain,fd);
        }
    }
    return res;
}

// ============================================================================
// FUNCTION fd_socket
// ============================================================================
int fd_socket (int domain, int type, int protocol) {
    int res = socket (domain, type, protocol);
    if (res >= LIMIT_FDT_MAX) abort();
    if (res>=0) FDT_SET(open,res);
    return res;
}

// ============================================================================
// FUNCTION fd_pipe
// ============================================================================
int fd_pipe (int fildes[2]) {
    int res = pipe (fildes);
    if (res == 0) {
        for (int i=0; i<2; ++i) {
            if (fildes[i] >= LIMIT_FDT_MAX) abort();
            FDT_SET(open,fildes[i]);
        }
    }
    return res;
}

// ============================================================================
// FUNCTION fd_dup
// ============================================================================
int fd_dup (int fd) {
    if (fd >= LIMIT_FDT_MAX) abort();
    int res = dup (fd);
    if (res >= LIMIT_FDT_MAX) abort();
    FDT_SET(open, res);
    if (FDT_ISSET(retain, fd)) {
        FDT_SET(retain, res);
    }
    else {
        FDT_CLR(retain, res);
    }
    return res;
}

// ============================================================================
// FUNCTION fd_dup2
// ============================================================================
int fd_dup2 (int orig, int nw) {
    int res = dup2 (orig, nw);
    if (res == 0) {
        if (orig >= LIMIT_FDT_MAX) abort();
        if (nw >= LIMIT_FDT_MAX) abort();
        FDT_SET(open,nw);
        FDT_SET(open,orig);
    }
    return res;
}

// ============================================================================
// FUNCTION fd_retain
// ============================================================================
void fd_retain (int fd) {
    if (fd<0 || fd>=LIMIT_FDT_MAX) abort();
    FDT_SET(retain,fd);
}

// ============================================================================
// FUNCTION fd_fork
// ============================================================================
pid_t fd_fork (void) {
    pid_t res = fork();
    if (res<0) return res;
    if (res == 0) {
        for (int i=0; i<LIMIT_FDT_MAX; ++i) {
            if (FDT_ISSET(open,i)) {
                if (! FDT_ISSET(retain,i)) {
                    FDT_CLR(open,i);
                    close(i);
                }
            }
        }
    }
    return res;
}

// ============================================================================
// FUNCTION fd_accept
// ============================================================================
int fd_accept (int sock, struct sockaddr *addr, socklen_t *addrlen) {
    int res = accept (sock, addr, addrlen);
    if (res>=0) {
        if (res >= LIMIT_FDT_MAX) abort();
        FDT_SET(open,res);
    }
    return res;
}

// ============================================================================
// FUNCTION sys_io_retain
// ----------------------
// Javascript call for telling the runtime to retain a specific file-
// descriptor across fork().
// ============================================================================
duk_ret_t sys_io_retain (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int fd = duk_get_int (ctx, 0);
    fd_retain (fd);
    return 0;
}

// ============================================================================
// FUNCTION sys_io_stat
// ============================================================================
duk_ret_t sys_io_stat (duk_context *ctx) {
    duk_idx_t objidx = duk_push_object (ctx);
    duk_idx_t arridx;
    int count;
    
    arridx = duk_push_array (ctx);
    count = 0;
    for (int i=0; i<LIMIT_FDT_MAX; ++i) {
        if (FDT_ISSET(open,i)) {
            duk_push_int (ctx, i);
            duk_put_prop_index (ctx, arridx, count++);
        }
    }
    duk_put_prop_string (ctx, objidx, "open");

    arridx = duk_push_array (ctx);
    count = 0;
    for (int i=0; i<LIMIT_FDT_MAX; ++i) {
        if (FDT_ISSET(retain,i)) {
            duk_push_int (ctx, i);
            duk_put_prop_index (ctx, arridx, count++);
        }
    }
    duk_put_prop_string (ctx, objidx, "retain");
    return 1;
}
