#ifndef _FD_H
#define _FD_H 1

#include <sys/socket.h>
#include "duktape.h"

#define LIMIT_FDT_MAX 1024

void        fd_init (void);
int         fd_open (const char *, int);
int         fd_close (int);
int         fd_socket (int, int, int);
int         fd_pipe (int fildes[2]);
int         fd_dup (int);
int         fd_dup2 (int, int);
void        fd_retain (int);
pid_t       fd_fork (void);
int         fd_accept (int socket, struct sockaddr *addr, socklen_t *addrlen);
duk_ret_t   sys_io_stat (duk_context *ctx);
duk_ret_t   sys_io_retain (duk_context *ctx);

#endif
