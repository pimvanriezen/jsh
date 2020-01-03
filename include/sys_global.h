#ifndef _SYS_GLOBAL_H
#define _SYS_GLOBAL_H 1

#include <pthread.h>
#include <stdint.h>

typedef struct gs_node gs_node;
struct gs_node {
    gs_node             *next;
    uint32_t             hash;
    char                 id[256];
    char                *value;
    pthread_mutex_t      lck; /* node lock, for end user */
    pthread_mutex_t      vlck; /* value lock */
};

typedef struct gs_rootnode gs_rootnode;
struct gs_rootnode {
    gs_rootnode         *next;
    gs_node             *first;
    uint32_t             hash;
    char                 id[256];
    pthread_mutex_t      lck;
};

typedef struct gs_root gs_root;
struct gs_root {
    gs_rootnode         *first;
    pthread_mutex_t      lck;
};

gs_root         *gs_root_ceeate (void);
gs_rootnode     *gs_root_find (gs_root *, const char *);

gs_rootnode     *gs_rootnode_create (const char *);
gs_node         *gs_rootnode_find_node (gs_rootnode *, const char *);
gs_node         *gs_rootnode_lock_node (gs_rootnode *, const char *);

gs_node         *gs_node_create (const char *);
char            *gs_node_value_copy (gs_node *);
void             gs_node_set_value (gs_node *, const char *);
void             gs_node_unlock (gs_node *);

void             global_init (void);
duk_ret_t        sys_global_get (duk_context *);
duk_ret_t        sys_global_set (duk_context *);

uint32_t         hash_token (const char *);

#endif
