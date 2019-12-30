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

sockdata SOCKINFO[1024];

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
    return res;
}

bool ipaddress_valid (ipaddress *addr) {
    int i;
    for (i=0; i<16; ++i) if (addr->d[i]) return true;
    return false;
}

void ipaddress_tostring (ipaddress *addr, char *into) {
    inet_ntop (AF_INET6, addr->d, into, INET6_ADDRSTRLEN);
}

void register_socket (int sock, socktype tp, ipaddress *addr, int port) {
    if (sock<0) return;
    if (sock>1023) return;
    
    SOCKINFO[sock].type = tp;
    if (addr) memcpy (&SOCKINFO[sock].remote, addr, sizeof(ipaddress));
    else memset (&SOCKINFO[sock].remote, 0, sizeof(ipaddress));
    SOCKINFO[sock].port = port;
}

void unregister_socket (int sock) {
    if (sock<0) return;
    if (sock>1023) return;
    
    SOCKINFO[sock].type = SOCK_FREE;
}

socktype socket_type (int sock) {
    if (sock<0) return SOCK_FREE;
    if (sock>1023) return SOCK_FREE;
    
    return SOCKINFO[sock].type;
}

void sys_sock_init (void) {
    memset (SOCKINFO, 0, 1024 * sizeof(sockdata));
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
    
    register_socket (sock, SOCK_TCP_OUT, addr, port);
    
    free (addr);
    if (bindaddr) free (bindaddr);
    
    duk_push_int (ctx, sock);
    return 1;
}

duk_ret_t sys_sock_tcp_listen (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    
    const char *addrspec = NULL;
    int port = 0;
    int pram = 1;
    
    if (duk_get_top (ctx) == 1) {
        port = duk_get_int (ctx, 0);
    }
    else {
        addrspec = duk_to_string (ctx, 0);
        port = duk_get_int (ctx, 1);
    }
    
    struct sockaddr_in6 localv6;
    ipaddress *addr = NULL;
    
    memset (&localv6, 0, sizeof (localv6));
    
    if (addrspec) {
        addr = make_address (addrspec);
        if (! ipaddress_valid (addr)) {
            free (addr);
            duk_push_error_object (ctx, DUK_ERR_ERROR, "Invalid address");
            return duk_throw (ctx);
        }
        memcpy (&localv6.sin6_addr, addr, sizeof(ipaddress));
    }
    else localv6.sin6_addr = in6addr_any;
    
    localv6.sin6_family = AF_INET6;
    localv6.sin6_port = htons (port);
    
    int sock = socket (PF_INET6, SOCK_STREAM, 0);
    if (sock<0) {
        if (addr) free (addr);
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    setsockopt (sock, SOL_SOCKET, SO_REUSEADDR, (char*) &pram, sizeof(int));

#ifdef SO_REUSEPORT
    setsockopt (sock, SOL_SOCKET, SO_REUSEPORT, (char *) &pram, sizeof(int));
#endif

    if (bind (sock, (struct sockaddr *) &localv6, sizeof(localv6)) < 0) {
        close (sock);
        if (addr) free (addr);
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    if (listen (sock, 16) != 0) {
        close (sock);
        if (addr) free (addr);
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Could not listen");
        return duk_throw (ctx);
    }
    
    register_socket (sock, SOCK_TCP_LISTEN, addr, port);
    if (addr) free (addr);
    duk_push_int (ctx, sock);
    return 1;
}

duk_ret_t sys_sock_accept (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    
    int lsock = duk_get_int (ctx, 0);
    socktype type = socket_type (lsock);
    if (type != SOCK_TCP_LISTEN && type != SOCK_UNIX_LISTEN) {
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Not a listening socket");
        return duk_throw (ctx);
    }
    
    struct sockaddr_in6 remote;
    struct sockaddr_in6 peer;
    socklen_t anint=1;
    int pram=1;
    
    memset (&remote, 0, sizeof (remote));
    memset (&peer, 0, sizeof (peer));
    
    int sock = accept (lsock, (struct sockaddr *) &remote, &anint);
    
    if (sock < 0) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    if (type == SOCK_TCP_LISTEN) {
        anint = sizeof (peer);
        getpeername (sock, (struct sockaddr *) &peer, &anint);
        register_socket (sock, SOCK_TCP_IN, (ipaddress*) &peer.sin6_addr,
                         ntohs (peer.sin6_port));
    }
    else {
        register_socket (sock, SOCK_UNIX_IN, NULL, 0);
    }
    
    duk_push_int (ctx, sock);
    return 1;
}

duk_ret_t sys_sock_stat (duk_context *ctx) {
    char addrstr[INET6_ADDRSTRLEN+1];
    int numresult = 0;
    addrstr[0] = 0;
    duk_idx_t arr_idx = duk_push_array (ctx);
    for (int i=0; i<1024; ++i) {
        socktype type = SOCKINFO[i].type;
        
        if (type == SOCK_FREE) continue;
        duk_idx_t obj_idx = duk_push_object (ctx);
        duk_push_int (ctx, i);
        duk_put_prop_string (ctx, obj_idx, "socket");
        if (type != SOCK_UNIX_OUT && type != SOCK_UNIX_IN &&
            type != SOCK_UNIX_LISTEN) {
            ipaddress_tostring (&SOCKINFO[i].remote, addrstr);
            duk_push_string (ctx, addrstr);
            duk_put_prop_string (ctx, obj_idx, "address");
            duk_push_int (ctx, SOCKINFO[i].port);
            duk_put_prop_string (ctx, obj_idx, "port");
        }
        switch (type) {
            case SOCK_TCP_OUT:
                duk_push_string (ctx, "SOCK_TCP_OUT");
                break;
            
            case SOCK_TCP_IN:
                duk_push_string (ctx, "SOCK_TCP_IN");
                break;
            
            case SOCK_TCP_LISTEN:
                duk_push_string (ctx, "SOCK_TCP_LISTEN");
                break;
            
            case SOCK_UDP:
                duk_push_string (ctx, "SOCK_UDP");
                break;
            
            case SOCK_UNIX_OUT:
                duk_push_string (ctx, "SOCK_UNIX_OUT");
                break;
            
            case SOCK_UNIX_IN:
                duk_push_string (ctx, "SOCK_UNIX_IN");
                break;
            
            case SOCK_UNIX_LISTEN:
                duk_push_string (ctx, "SOCK_UNIX_LISTEN");
                break;
            
            default:
                duk_push_string (ctx, "SOCK_UNKNOWN");
                break;
        }
        duk_put_prop_string (ctx, obj_idx, "type");
        duk_put_prop_index (ctx, arr_idx, numresult++);
    }
    return 1;
}
