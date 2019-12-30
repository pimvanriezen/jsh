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
#include <signal.h>
#include <netinet/in.h>
#include <sys/un.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>
#include "duktape.h"
#include "sys_sock.h"
#include "textbuffer.h"

ipaddress *make_address (const char *str) {
    ipaddress *res = calloc (1, sizeof (ipaddress));

    if (strchr (str, ':') == NULL) {
        if (inet_pton (AF_INET, str, res->d+12) == 1) {
            res->d[10] = 0xff;
            res->d[11] = 0xff;
        }
    }
    else {
        inet_pton (AF_INET6, str, res);
    }
    printf ("addr: ");
    for (int i=0; i<16; ++i) {
        printf ("%02x ", res->d[i]);
    }
    printf ("\n");
    return res;
}

bool ipaddress_valid (ipaddress *addr) {
    int i;
    for (i=0; i<16; ++i) if (addr->d[i]) return true;
    return false;
}

duk_ret_t sys_sock_tcp (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *addrspec = duk_to_string (ctx, 0);
    int port = duk_get_int (ctx, 1);
    const char *bindaddrspec = NULL;
    if (duk_get_top (ctx) > 2) {
        bindaddrspec = duk_to_string (ctx, 2);
    }
    
    struct sockaddr_in6 remotev6;
    struct sockaddr_in6 localv6;
    bool usev4 = false;
    int pram = 1;
    int sock;

    ipaddress *addr = make_address (addrspec);
    ipaddress *bindaddr = NULL;
    
    if (! ipaddress_valid (addr)) {
        free (addr);
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Invalid address");
        return duk_throw (ctx);
    }

    if (bindaddrspec) {
        bindaddr = make_address (addrspec);
        if (! ipaddress_valid (bindaddr)) {
            free (addr);
            free (bindaddr);
            duk_push_error_object (ctx, DUK_ERR_ERROR, "Invalid address");
            return duk_throw (ctx);
        }
    }
    
    sock = socket (PF_INET6, SOCK_STREAM, 0);
    if (sock < 0) {
        free (addr);
        if (bindaddr) free (bindaddr);
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Could not create socket");
        return duk_throw(ctx);
    }

    memset (&remotev6, 0, sizeof (remotev6));
    memset (&localv6, 0, sizeof (localv6));
    
    memcpy (&remotev6.sin6_addr, addr, sizeof(ipaddress));
    remotev6.sin6_family = AF_INET6;
    remotev6.sin6_port = htons (port);
    
    setsockopt (sock, SOL_SOCKET, SO_KEEPALIVE, (char *) &pram, sizeof(int));
    
    if (bindaddrspec) {
        memcpy (&localv6.sin6_addr, bindaddr, sizeof(ipaddress));
        localv6.sin6_family = AF_INET;
        localv6.sin6_port = 0;
        
        if (bind (sock, (struct sockaddr *) &localv6, sizeof(localv6))) {
            free (addr);
            if (bindaddr) free (bindaddr);
            close (sock);
            duk_push_error_object (ctx, DUK_ERR_ERROR,
                                   "Could not bind to local address");
            return duk_throw(ctx);
        }
    }
    
    if (connect (sock, (struct sockaddr*) &remotev6, sizeof(remotev6))) {
        free (addr);
        if (bindaddr) free (bindaddr);
        close (sock);
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    duk_push_int (ctx, sock);
    return 1;
}
