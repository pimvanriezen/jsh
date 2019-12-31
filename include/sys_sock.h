#ifndef _SYS_SOCK_H
#define _SYS_SOCK_H 1

#include <stdbool.h>

typedef struct {
    unsigned char d[16];
} ipaddress;

ipaddress *make_address (const char *);
bool ipaddress_valid (ipaddress *);
void ipaddress_tostring (ipaddress *, char *);

typedef enum {
    SOCK_FREE = 0,
    SOCK_TCP_OUT,
    SOCK_TCP_IN,
    SOCK_TCP_LISTEN,
    SOCK_UDP,
    SOCK_UNIX_OUT,
    SOCK_UNIX_IN,
    SOCK_UNIX_LISTEN
} socktype;

typedef struct sockdata_s {
    socktype    type;
    ipaddress   remote;
    int         port;
} sockdata;

extern sockdata SOCKINFO[1024];

void register_socket (int, socktype, ipaddress *, int);
void unregister_socket (int);
socktype socket_type (int);

void sys_sock_init (void);
duk_ret_t sys_sock_unix (duk_context *);
duk_ret_t sys_sock_tcp (duk_context *);
duk_ret_t sys_sock_unixlisten (duk_context *);
duk_ret_t sys_sock_tcplisten (duk_context *);
duk_ret_t sys_sock_accept (duk_context *);
duk_ret_t sys_sock_stat (duk_context *);
duk_ret_t sys_sock_udp (duk_context *);
duk_ret_t sys_sock_udpbind (duk_context *);
duk_ret_t sys_sock_recv (duk_context *);
duk_ret_t sys_sock_send (duk_context *);

#endif
