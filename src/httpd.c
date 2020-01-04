#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <microhttpd.h>
#include <stdbool.h>
#include <pthread.h>
#include <arpa/inet.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <ctype.h>
#include "duktape.h"
#include "duk_console.h"
#include "duk_module_duktape.h"
#include "textbuffer.h"
#include "sugar.h"
#include "version.h"

extern void sys_init (void);
extern void sys_init_heap (duk_context *);

typedef struct heapstore_item {
    struct heapstore_item   *next;
    duk_context             *ctx;
    char                     errstr[1024];
    bool                     error;
    bool                     inuse;
} heapstore_item;

typedef struct heapstore {
    heapstore_item          *first;
    pthread_mutex_t          mutex;
    char                    *code;
} heapstore;

static heapstore HS;

void heapstore_init (const char *);
heapstore_item *heapstore_acquire (void);
void heapstore_release (heapstore_item *);
heapstore_item *heapstore_item_create (const char *);
void fatal_handler (void *, const char *);
duk_context *create_heap (heapstore_item *, const char *);

// ============================================================================
// FUNCTION heapstore_init
// ============================================================================
void heapstore_init (const char *fn) {
    struct textbuffer *t = NULL;
    pthread_mutex_init (&HS.mutex, NULL);
    HS.first = NULL;
    t = textbuffer_load (fn);
    if (! t) {
        fprintf (stderr, "Code could not be loaded\n");
        exit (1);
    }
    
    HS.code = handle_sugar (t->alloc);
    textbuffer_free (t);
    heapstore_item *item1 = heapstore_acquire();
    heapstore_item *item2 = heapstore_acquire();
    heapstore_release (item1);
    heapstore_release (item2);
}

// ============================================================================
// FUNCTION heapstore_acquire
// ============================================================================
heapstore_item *heapstore_acquire (void) {
    pthread_mutex_lock (&HS.mutex);
    heapstore_item *crsr = HS.first;
    heapstore_item *pcrsr = NULL;
    if (! crsr) {
        crsr = HS.first = heapstore_item_create(HS.code);
        crsr->inuse = true;
        pthread_mutex_unlock (&HS.mutex);
        return crsr;
    }
    while (crsr->inuse && crsr->next) {
        crsr = crsr->next;
    }
    if (crsr->inuse) {
        crsr->next = heapstore_item_create(HS.code);
        crsr = crsr->next;
    }
    crsr->inuse = true;
    pthread_mutex_unlock (&HS.mutex);
    return crsr;
}

// ============================================================================
// FUNCTION heapstore_relase
// ============================================================================
void heapstore_release (heapstore_item *it) {
    pthread_mutex_lock (&HS.mutex);
    it->inuse = false;
    pthread_mutex_unlock (&HS.mutex);
}

// ============================================================================
// FUNCTION heapstore_item_create
// ============================================================================
heapstore_item *heapstore_item_create (const char *code) {
    heapstore_item *res = malloc (sizeof (heapstore_item));
    res->next = NULL;
    res->inuse = false;
    res->error = false;
    res->errstr[0] = 0;
    res->ctx = create_heap(res, code);
    return res;
}

// ============================================================================
// FUNCTION fatal_handler
// ============================================================================
void fatal_handler (void *udata, const char *msg) {
    fprintf (stderr, "%% Fatal: %s", msg ? msg : "unknown");
    exit (1);
    heapstore_item *item = (heapstore_item *) udata;
    item->error = true;
    if (msg) {
        strncpy (item->errstr, msg, 1023);
        item->errstr[1023] = 0;
    }
    else {
        strcpy (item->errstr, "No message");
    }
}

static duk_ret_t string_frombufferraw(duk_context *ctx) {
    duk_buffer_to_string(ctx, 0);
    return 1;
}

// ============================================================================
// FUNCTION create_heap
// ============================================================================
duk_context *create_heap (heapstore_item *owner, const char *code) {
    duk_context *ctx;
    ctx = duk_create_heap (NULL, NULL, NULL, owner, fatal_handler);
    if (! ctx) abort();
    
    duk_eval_string(ctx,
        "(function(v){"
            "if (typeof String === 'undefined') { String = {}; }"
            "Object.defineProperty(String, 'fromBufferRaw', "
            "{value:v, configurable:true});"
        "})");
    duk_push_c_function(ctx, string_frombufferraw, 1 /*nargs*/);
    (void) duk_pcall(ctx, 1);
    duk_pop(ctx);
    
    duk_eval_string(ctx,
        "console={log:function() {\n"
        "  arguments = Array.prototype.slice.call(arguments);\n"
        "  print((''+new Date()).substr(0,19)+': '+\n"
        "        arguments.join(' ')+'\\n');\n"
        "}}\n");
        
    duk_module_duktape_init (ctx);
    sys_init_heap (ctx);
    
    duk_eval_string(ctx,
        "request={\n"
        "  _outhdr:{'Content-Type':'text/html'},\n"
        "  _inhdr:{},\n"
        "  _returndata:'',\n"
        "  _returnfile:'',\n"
        "  peer:'::',\n"
        "  url:'',\n"
        "  postbody:'',\n"
        "  method:'GET',\n"
        "  canonizeHeaderName:function(hdr){\n"
        "    var splt = hdr.split('-');\n"
        "    for (var i=0; i<splt.length; ++i) {\n"
        "      splt[i] = splt[i][0].toUpperCase() + "
                            "splt[i].substr(1).toLowerCase();\n"
        "    }\n"
        "    return splt.join('-');\n"
        "  },\n"
        "  setHandler:function(fn){\n"
        "    request.f=function() {return fn.resolve ? "
                                    "fn.resolve(request) : fn(request)};\n"
        "  },\n"
        "  getHeader:function(nam) {\n"
        "    var key = this.canonizeHeaderName(nam);\n"
        "    return request._inhdr[key];\n"
        "  },\n"
        "  setHeader:function(nam,val) {\n"
        "    var key = this.canonizeHeaderName(nam);\n"
        "    request._outhdr[key] = val;\n"
        "  },\n"
        "  getPeer:function() {return request._peer;},\n"
        "  send:function(d) {\n"
        "    if (typeof(d) == 'object') {\n"
        "      request._returndata = JSON.stringify(d);\n"
        "      request._outhdr['Content-Type'] = 'application/json';\n"
        "    }\n"
        "    else request._returndata += d;\n"
        "  },\n"
        "  clear:function() {request._returndata = ''},\n"
        "  sendFile:function(f) {\n"
        "    if (exists (f)) {\n"
        "      request.clear();\n"
        "      request._returnfile = f;\n"
        "    }\n"
        "  },\n"
        "  print:function() {request.send(arguments.join(' ')+'\\n');},\n"
        "  f:function(){\n"
        "    request.send ('Service not implemented\\n');\n"
        "    return 500;\n"
        "  }\n"
        "};");
    
    duk_push_string (ctx, "service");
    if (duk_pcompile_string_filename (ctx, 0, code) != 0) {
        fprintf (stderr, "%% %s:\n", duk_safe_to_string (ctx, -1));
        exit (1);
    }
    
    duk_call (ctx, 0);
    return ctx;
}

// ============================================================================
// FUNCTION enumerate_header
// ============================================================================
int enumerate_header (void *cls, enum MHD_ValueKind kind, const char *key,
                      const char *value) {
    heapstore_item *item = (heapstore_item *) cls;
    duk_context *ctx = item->ctx;
    char *keydup = strdup (key);
    if (*keydup) {
        keydup[0] = toupper (keydup[0]);
        for (int i=1; keydup[i]; ++i) {
            if (keydup[i] == '-') {
                i++;
                if (keydup[i]) keydup[i] = toupper (keydup[i]);
            }
            else keydup[i] = tolower (keydup[i]);
        }
    }
    
    duk_push_global_object (ctx);
    duk_get_prop_string (ctx, -1, "request");
    duk_get_prop_string (ctx, -1, "_inhdr");
    duk_push_string (ctx, value);
    duk_put_prop_string (ctx, -2, keydup);
    duk_pop(ctx);
    duk_pop(ctx);
    duk_pop(ctx);
    free (keydup);
    return MHD_YES;
}

// ============================================================================
// FUNCTION answer_to_connection
// ============================================================================
int answer_to_connection (void *cls, struct MHD_Connection *connection,
                          const char *url,
                          const char *method, const char *version,
                          const char *upload_data,
                          size_t *upload_data_size,
                          void **con_cls) {
    heapstore_item *item = *con_cls;
    char remote[INET6_ADDRSTRLEN];
    duk_context *ctx = NULL;
    
    /* if the connection has no context data yet, acquire a heapstore
       item and initialize its request object */
    if (item == NULL) {
        char serverstr[256];
        sprintf (serverstr, "JSHTTPd/%s (%s)", JSH_VERSION, JSH_PLATFORM);
        item = heapstore_acquire();
        ctx = item->ctx;
        duk_push_global_object (ctx);
        duk_get_prop_string (ctx, -1, "request");
        duk_push_string (ctx, url);
        duk_put_prop_string (ctx, -2, "url");
        duk_push_string (ctx, method);
        duk_put_prop_string (ctx, -2, "method");
        duk_push_object (ctx);
        duk_push_string (ctx, "text/html");
        duk_put_prop_string (ctx, -2, "Content-Type");
        duk_push_string (ctx, serverstr);
        duk_put_prop_string (ctx, -2, "Server");
        duk_put_prop_string (ctx, -2, "_outhdr");
        duk_push_string (ctx, "");
        duk_put_prop_string (ctx, -2, "_returndata");
        duk_push_string (ctx, "");
        duk_put_prop_string (ctx, -2, "_returnfile");
        duk_pop(ctx);
        duk_pop(ctx);
        *con_cls = item;
        return MHD_YES;
    }
    
    ctx = item->ctx;
    
    /* Handle post data */
    if (*upload_data_size) {
        duk_push_global_object (ctx);
        duk_get_prop_string (ctx, -1, "request");
        duk_push_lstring (ctx, upload_data, *upload_data_size);
        duk_put_prop_string (ctx, -2, "postbody");
        duk_pop(ctx);
        duk_pop(ctx);
        *upload_data_size = 0;
        return MHD_YES;
    }
    
    /* Handle input headers */
    MHD_get_connection_values (connection, MHD_HEADER_KIND,
                               enumerate_header, item);
    
    /* Handle other metadata */
    duk_push_global_object (ctx); // +1 [glo]
    duk_get_prop_string (ctx, -1, "request"); // +2 [glo req]
    
    struct sockaddr *so;
    so = MHD_get_connection_info (connection,
            MHD_CONNECTION_INFO_CLIENT_ADDRESS)->client_addr;
    
    if (so->sa_family == AF_INET) {
        struct sockaddr_in *si = (struct sockaddr_in *) so;        
        inet_ntop (AF_INET, &si->sin_addr, remote, INET6_ADDRSTRLEN);
    }
    else if (so->sa_family == AF_INET6) {
        struct sockaddr_in6 *si = (struct sockaddr_in6 *) so;
        inet_ntop (AF_INET6, &si->sin6_addr, remote, INET6_ADDRSTRLEN);
    }
    else strcpy (remote, "??");
    
    duk_push_string (ctx, remote); // +3 [glo req *]
    duk_put_prop_string (ctx, -2, "peer"); // +2 [glo req]

    /* call request.f() */
    duk_push_string (ctx, "f"); // +3 [glo req 'f']
    duk_call_prop (ctx, -2, 0); // +3 [glo req <return>]
    
    const char *respbody;
    size_t respsz;
    
    int status = duk_get_int (ctx, -1);
    struct MHD_Response *response = NULL;
    
    /* First check if there's no returnfile, because then we're totally
       doing that. */
    duk_get_prop_string (ctx, -2, "_returnfile");
    const char *fn = duk_to_string (ctx, -1);
    if (*fn) {
        struct stat st;
        int fd;
        if (stat(fn, &st) == 0) {
            fd = open (fn, O_RDONLY);
            response = MHD_create_response_from_fd (st.st_size, fd);
        }
    }
    duk_pop(ctx);
    
    if (! response) {
        /* Get the body data from the function return */
        duk_get_prop_string (ctx, -2, "_returndata"); // +4 [glo req <st> <ret>]
    
        respbody = duk_to_string (ctx, -1);
        respsz = strlen (respbody);
    
        /* Start building up the response from the returned body */
        response = MHD_create_response_from_buffer
            (respsz,(void*)respbody,MHD_RESPMEM_MUST_COPY);

        duk_pop(ctx); // +3 [glo req <st>]
    }
    /* Add in the headers from request._outhdr */
    duk_get_prop_string (ctx, -2, "_outhdr"); // +4 [glo req <return> hdr]
    duk_enum (ctx, -1, 0/*enum flags*/); // +5 [glo req <r> hdr enum]

    while (duk_next (ctx, -1, 1/*get value*/)) {
        MHD_add_response_header (response, duk_safe_to_string(ctx,-2),
                                 duk_safe_to_string (ctx,-1));
        duk_pop_2 (ctx);
    }
    duk_pop (ctx); // +4 [glo req <r> hdr]
    duk_pop (ctx); // +3 [glo req <r>]
    duk_pop (ctx); // +2 [glo req]
    duk_pop (ctx); // +1 [glo]
    duk_pop (ctx); // 0
    
    /* send it off to lala-land */
    MHD_queue_response (connection, status, response);
    MHD_destroy_response (response);
    
    /* Release the heapstore_item and end the request */
    heapstore_release (item);
    *con_cls = NULL;
    return MHD_YES;
}

char **main_argv;

int checkflag (const char *arg, const char *opt1, const char *opt2) {
    if (strcmp (arg, opt1) == 0) return 1;
    if (strcmp (arg, opt2) == 0) return 1;
    return 0;
}

int main (int argc, char *argv[]) {
    main_argv = argv;
    int optPort = 0;
    int optMaxConnections = 48;
    int optMaxConnectionsPerIP = 8;
    bool optUseSSL = false;
    
    const char *sslServerKey = NULL;
    const char *sslServerCert = NULL;
    const char *optScript = NULL;
    struct textbuffer *tb;
    
    for (int i=1;i<argc; ++i) {
        const char *arg = argv[i];
        const char *narg = NULL;
        if (i<argc-1) narg = argv[i+1];
        
        if (checkflag (arg,"-p","--port")) {
            if (narg) {
                optPort = atoi(narg);
                i++;
            }
        }
        else if (checkflag (arg, "-m","--max-connections")) {
            if (narg) {
                optMaxConnections = atoi (narg);
                i++;
            }
        }
        else if (checkflag (arg, "-i","--max-connections-per-ip")) {
            if (narg) {
                optMaxConnectionsPerIP = atoi (narg);
                i++;
            }
        }
        else if (checkflag (arg, "-s","--ssl")) {
            optUseSSL = true;
        }
        else if (checkflag (arg, "-k","--ssl-key")) {
            if (narg) {
                tb = textbuffer_load (narg);
                if (! tb) {
                    fprintf (stderr, "%% File '%s' not found\n", narg);
                    return 1;
                }
                sslServerKey = tb->alloc;
                tb->alloc = NULL;
                textbuffer_free (tb);
            }
        }
        else if (checkflag (arg, "-c","--ssl-certificate")) {
            if (narg) {
                tb = textbuffer_load (narg);
                if (! tb) {
                    fprintf (stderr, "%% File '%s' not found\n", narg);
                    return 1;
                }
                sslServerCert = tb->alloc;
                tb->alloc = NULL;
                textbuffer_free (tb);
            }
        }   
        else if (arg[0] == '-') {
            fprintf (stderr, "%% Unknown flag '%s'\n", arg);
            return 1;
        }
        else optScript = arg;
    }
    
    if (! optPort || ! optScript) {
        fprintf (stderr, "%% Usage: %s --port <port> [options] <script>\n"
                         "  -p --port <nr>                   "
                                "TCP listening port number\n"
                         "  -s --ssl                         "
                                "Use SSL\n"
                         "  -c --ssl-certificate <path>      "
                                "Location of cert file\n"
                         "  -k --ssl-key <path>              "
                                "Location of key file\n"
                         "  -m --max-connections <nr>        "
                                "Thread limit\n"
                         "  -i --max-connections-per-ip <nr> "
                                "Client connection limit\n", argv[0]);
        return 0;
    }
    
    sys_init();
    heapstore_init (optScript);
    
    struct MHD_Daemon *daemon;
    unsigned int flags = MHD_USE_THREAD_PER_CONNECTION |
                         MHD_USE_DUAL_STACK;

    if (optUseSSL) {
        flags |= MHD_USE_SSL;
        daemon = MHD_start_daemon (flags, optPort, NULL, NULL,
                                   &answer_to_connection,
                                   NULL, MHD_OPTION_CONNECTION_LIMIT,
                                   (unsigned int) optMaxConnections,
                                   MHD_OPTION_PER_IP_CONNECTION_LIMIT,
                                   (unsigned int) optMaxConnectionsPerIP,
                                   MHD_OPTION_HTTPS_MEM_KEY, sslServerKey,
                                   MHD_OPTION_HTTPS_MEM_CERT, sslServerCert,
                                   MHD_OPTION_END);
    }
    else {
        daemon = MHD_start_daemon (flags, optPort, NULL, NULL,
                                   &answer_to_connection,
                                   NULL, MHD_OPTION_CONNECTION_LIMIT,
                                   (unsigned int) optMaxConnections,
                                   MHD_OPTION_PER_IP_CONNECTION_LIMIT,
                                   (unsigned int) optMaxConnectionsPerIP,
                                   MHD_OPTION_END);
    }
    
    while (1) sleep (60);
    return 0;
}
