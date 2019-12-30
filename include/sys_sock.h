#ifndef _SYS_SOCK_H
#define _SYS_SOCK_H 1

#include <stdbool.h>

typedef struct {
    unsigned char d[16];
} ipaddress;

ipaddress *make_address (const char *);
bool ipaddress_isvalid (ipaddress *);

duk_ret_t sys_sock_tcp (duk_context *);

#endif
