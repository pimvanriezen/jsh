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
#include <stdbool.h>
#include "duktape.h"
#include "sys_global.h"
#include "textbuffer.h"

static gs_root *GROOT;

// ============================================================================
// FUNCTION gs_root_create
// ============================================================================
gs_root *gs_root_create (void) {
    gs_root *res = malloc (sizeof (gs_root));
    res->first = NULL;
    pthread_mutex_init (&res->lck, NULL);
    return res;
}

// ============================================================================
// FUNCTION gs_root_find
// ============================================================================
gs_rootnode *gs_root_find (gs_root *root, const char *key) {
    uint32_t khash = hash_token (key);
    gs_rootnode *res = root->first;
    while (res) {
        if (res->hash == khash) {
            if (strcmp (res->id, key) == 0) break;
        }
        res = res->next;
    }
    if (res) return res;
    pthread_mutex_lock (&root->lck);
    res = gs_rootnode_create(key);
    if (! root->first) {
        root->first = res;
    }
    else {
        gs_rootnode *crsr = root->first;
        while (crsr->next) crsr = crsr->next;
        crsr->next = res;
    }
    pthread_mutex_unlock (&root->lck);
    return res;
}

// ============================================================================
// FUNCTION gs_rootnode_create
// ============================================================================
gs_rootnode *gs_rootnode_create (const char *key) {
    gs_rootnode *res = malloc (sizeof (gs_rootnode));
    res->hash = hash_token (key);
    res->next = NULL;
    res->first = NULL;
    strncpy (res->id, key, 255);
    res->id[255] = 0;
    pthread_mutex_init (&res->lck, NULL);
    return res;
}

// ============================================================================
// FUNCTION gs_rootnode_find_node
// ============================================================================
gs_node *gs_rootnode_find_node (gs_rootnode *p, const char *key) {
    uint32_t khash = hash_token (key);
    gs_node *res = p->first;
    while (res) {
        if (res->hash == khash) {
            if (strcmp (res->id, key) == 0) break;
        }
        res = res->next;
    }
    if (res) return res;
    pthread_mutex_lock (&p->lck);
    res = gs_node_create (key);
    if (! p->first) {
        p->first = res;
    }
    else {
        gs_node *crsr = p->first;
        while (crsr->next) crsr = crsr->next;
        crsr->next = res;
    }
    pthread_mutex_unlock (&p->lck);
    return res;
}

// ============================================================================
// FUNCTION gs_rootnode_lock_node
// ============================================================================
gs_node *gs_rootnode_lock_node (gs_rootnode *p, const char *key) {
    gs_node *res = gs_rootnode_find_node (p, key);
    pthread_mutex_lock (&res->lck);
    return res;
}

// ============================================================================
// FUNCTION gs_node_create
// ============================================================================
gs_node *gs_node_create (const char *key) {
    gs_node *res = malloc (sizeof (gs_node));
    res->next = NULL;
    res->hash = hash_token (key);
    strncpy (res->id, key, 255);
    res->id[255] = 0;
    res->value = NULL;
    pthread_mutex_init (&res->lck, NULL);
    pthread_mutex_init (&res->vlck, NULL);
    return res;
}

// ============================================================================
// FUNCTION gs_node_value_copy
// ============================================================================
char *gs_node_value_copy (gs_node *self) {
    char *res;
    if (! self->value) return NULL;
    pthread_mutex_lock (&self->vlck);
    res = strdup (self->value);
    pthread_mutex_unlock (&self->vlck);
    return res;
}

// ============================================================================
// FUNCTION gs_node_set_value
// ============================================================================
void gs_node_set_value (gs_node *self, const char *value) {
    pthread_mutex_lock (&self->vlck);
    if (self->value) free (self->value);
    self->value = strdup (value);
    pthread_mutex_unlock (&self->vlck);
}

// ============================================================================
// FUNCTION gs_node_unlock
// ============================================================================
void gs_node_unlock (gs_node *self) {
    pthread_mutex_unlock (&self->lck);
}

// ============================================================================
// FUNCTION global_init
// ============================================================================
void global_init (void) {
    GROOT = gs_root_create();
}

// ============================================================================
// FUNCTION sys_global_get
// ============================================================================
duk_ret_t sys_global_get (duk_context *ctx) {
    // sys.global.get ("root","key")
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    const char *rootkey = duk_to_string (ctx, 0);
    const char *subkey = duk_to_string (ctx, 1);
    bool locked = false;
    if (duk_get_top (ctx) > 2) {
        locked = duk_get_boolean (ctx, 2) ? true : false;
    }
    
    gs_rootnode *root = gs_root_find (GROOT, rootkey);
    gs_node *node;
    
    if (locked) {
        node = gs_rootnode_lock_node (root, subkey);
    }
    else {
        node = gs_rootnode_find_node (root, subkey);
    }
    char *data = gs_node_value_copy (node);
    if (! data) duk_push_null (ctx);
    else {
        duk_push_string (ctx, data);
        free (data);
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_global_set
// ============================================================================
duk_ret_t sys_global_set (duk_context *ctx) {
    if (duk_get_top (ctx) < 3) return DUK_RET_TYPE_ERROR;
    const char *rootkey = duk_to_string (ctx, 0);
    const char *subkey = duk_to_string (ctx, 1);
    const char *value = duk_to_string (ctx, 2);
    
    gs_rootnode *root = gs_root_find (GROOT, rootkey);
    gs_node *node = gs_rootnode_find_node (root, subkey);
    gs_node_set_value (node, value);
    gs_node_unlock (node);
    return 0;
}

static uint32_t IHASH = 0;

// ============================================================================
// FUNCTION hash_token
// ============================================================================
uint32_t hash_token (const char *str) {
    uint32_t hash = 0;
    uint32_t i    = 0;
    uint32_t s    = 0;
    int sdf;

    /* Set up a random intial hash once */
    if (! IHASH)
    {
        sdf = open ("/dev/urandom", O_RDONLY);
        if (sdf<0) sdf = open ("/dev/random", O_RDONLY);
        if (sdf>=0)
        {
            (void) read (sdf, &IHASH, sizeof(IHASH));
            close (sdf);
        }
        if (! IHASH) IHASH = 5138; /* fair dice roll */
        IHASH ^= time(NULL);
        IHASH ^= getpid();
    }

    hash = IHASH;

    const unsigned char* ustr = (const unsigned char*)str;

    for (i = 0; ustr[i]; i++) {
        hash = ((hash << 5) + hash) + (ustr[i] & 0xDF);
    }

    s = hash;

    switch (i) { /* note: fallthrough for each case */
        default:
        case 6: hash += (s % 5779) * (ustr[6] & 0xDF);
        case 5: hash += (s % 4643) * (ustr[5] & 0xDF); hash ^= hash << 7;
        case 4: hash += (s %  271) * (ustr[4] & 0xDF);
        case 3: hash += (s % 1607) * (ustr[3] & 0xDF); hash ^= hash << 15;
        case 2: hash += (s % 7649) * (ustr[2] & 0xDF);
        case 1: hash += (s % 6101) * (ustr[1] & 0xDF); hash ^= hash << 25;
        case 0: hash += (s % 1217) * (ustr[0] & 0xDF);
    }

    /* zero is inconvenient */
    if (hash == 0) hash = 154004;
    return hash;
}
