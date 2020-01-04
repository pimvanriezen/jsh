#ifdef WITH_SQLITE3
#include <sqlite3.h>
#include <pthread.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdbool.h>
#include "duktape.h"

typedef struct sql_descriptor sql_descriptor;

struct sql_descriptor {
    int              id;
    int              rowsaffected;
    sql_descriptor  *next, *prev;
    sqlite3         *hdl;
};

typedef struct sql_list sql_list;
struct sql_list {
    int              lastid;
    sql_descriptor  *first, *last;
    pthread_mutex_t  mutex;
};

sql_list SQL;

void sql_init (void) {
    SQL.lastid = 0;
    SQL.first = SQL.last = NULL;
    pthread_mutex_init (&SQL.mutex, NULL);
}

sql_descriptor *sql_descriptor_create (void) {
    sql_descriptor *res = malloc (sizeof (sql_descriptor));
    res->id = 0;
    res->hdl = NULL;
    res->next = NULL;
    res->prev = NULL;
    return res;
}

sql_descriptor *sql_list_find (int id) {
    pthread_mutex_lock (&SQL.mutex);
    sql_descriptor *crsr = SQL.first;
    while (crsr) {
        if (crsr->id == id) break;
        crsr = crsr->next;
    }
    pthread_mutex_unlock (&SQL.mutex);
    return crsr;
}

int sql_list_open (const char *path) {
    int res = 0;
    sql_descriptor *nsql = sql_descriptor_create();
    if (sqlite3_open (path, &nsql->hdl) != SQLITE_OK) {
        free (nsql);
        return 0;
    }
    
    pthread_mutex_lock (&SQL.mutex);
    SQL.lastid++;
    res = nsql->id = SQL.lastid;
    if (SQL.last) {
        SQL.last->next = nsql;
        nsql->prev = SQL.last;
        SQL.last = nsql;
    }
    else {
        SQL.first = SQL.last = nsql;
    }
    pthread_mutex_unlock (&SQL.mutex);
    return res;
}

void sql_list_close (int id) {
    sql_descriptor *node = sql_list_find (id);
    if (! node) return;
    pthread_mutex_lock (&SQL.mutex);
    if (node->hdl) sqlite3_close (node->hdl);
    if (node->next) {
        node->next->prev = node->prev;
    }
    else {
        SQL.last = node->prev;
    }
    if (node->prev) {
        node->prev->next = node->next;
    }
    else {
        SQL.first = node->next;
    }
    pthread_mutex_unlock (&SQL.mutex);
    free (node);
}

duk_ret_t sys_sql_open (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    const char *path = duk_to_string (ctx, 0);
    int hdl = sql_list_open (path);
    duk_push_int (ctx, hdl);
    return 1;
}

duk_ret_t sys_sql_close (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int hdl = duk_get_int (ctx, 0);
    sql_list_close (hdl);
    return 0;
}

static void freearr (char **a, int count) {
    for (int i=0; i<count; ++i) free (a[i]);
    free (a);
}

static void pushrow (duk_context *ctx, sqlite3_stmt *stmt,
                     char **colnames, int colcount) {
    duk_idx_t obj_idx = duk_push_object (ctx);
    for (int i=0; i<colcount; ++i) {
        int ctype = sqlite3_column_type (stmt, i);
        switch (ctype) {
            case SQLITE_INTEGER:
                duk_push_int (ctx, sqlite3_column_int (stmt, i));
                break;
            
            case SQLITE_FLOAT:
                duk_push_number (ctx, sqlite3_column_double (stmt, i));
                break;
            
            case SQLITE_BLOB:
            case SQLITE_TEXT:
                duk_push_string (ctx, (const char *)
                                 sqlite3_column_text (stmt, i));
                break;
            
            default:
                duk_push_null (ctx);
                break;
        }
        duk_put_prop_string (ctx, obj_idx, colnames[i]);
    }
}

// sys.sql.query (id, query, param, param, param...)
duk_ret_t sys_sql_query (duk_context *ctx) {
    int nparam = duk_get_top (ctx) - 2;
    if (nparam<0) return DUK_RET_TYPE_ERROR;
    int hdl = duk_get_int (ctx, 0);
    const char *query = duk_to_string (ctx, 1);
    
    sql_descriptor *sql = sql_list_find (hdl);
    if (!sql || !sql->hdl) {
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Handle not found");
        return duk_throw (ctx);
    }
    sqlite3_stmt *stmt;
    int qres;
    qres = sqlite3_prepare_v2 (sql->hdl, query, strlen(query), &stmt, 0);
    if (qres != SQLITE_OK) {
        duk_push_error_object (ctx, DUK_ERR_ERROR,
                               sqlite3_errmsg(sql->hdl));
        return duk_throw (ctx);
    }
    
    for (int ai=0; ai<nparam; ++ai) {
        printf ("param %i ", ai);
        if (duk_is_number (ctx, ai+2)) {
            sqlite3_bind_double (stmt, ai+1, duk_get_number (ctx, ai+2));
        }
        else if (duk_is_null (ctx, ai+2)) {
            sqlite3_bind_null (stmt, ai+1);
        }
        else {
            const char *str = duk_to_string (ctx, ai+2);
            size_t len = strlen (str);
            sqlite3_bind_text (stmt, ai+1, str, len, SQLITE_STATIC);
        }
    }
    
    if (! (qres = sqlite3_step (stmt))) {
        duk_push_error_object (ctx, DUK_ERR_ERROR,
                               sqlite3_errmsg(sql->hdl));
        sqlite3_finalize (stmt);
        return duk_throw (ctx);
    }
    
    sql->rowsaffected = sqlite3_changes (sql->hdl);
    duk_idx_t res_idx = duk_push_array (ctx);
    
    int colcount = sqlite3_column_count (stmt);
    if (colcount <= 0) {
        duk_pop (ctx);
        duk_push_boolean (ctx, 1);
        sqlite3_finalize (stmt);
        return 1;
    }
    
    int rowid = 0;
    char **colnames = malloc (colcount * sizeof(char *));
    for (int i=0; i<colcount; ++i) {
        colnames[i] = strdup (sqlite3_column_name (stmt, i));
    }
    
    int done = false;
    do {
        switch (qres) {
            case SQLITE_BUSY:
                sleep (1);
                sqlite3_reset (stmt);
                continue;
                
            case SQLITE_MISUSE:
            case SQLITE_ERROR:
                freearr (colnames,colcount);
                duk_push_error_object (ctx, DUK_ERR_ERROR,
                                       sqlite3_errmsg(sql->hdl));
                sqlite3_finalize (stmt);
                return duk_throw (ctx);
            
            case SQLITE_DONE:
                done = true;
                break;
                
            case SQLITE_ROW:
                pushrow (ctx, stmt, colnames, colcount);
                duk_put_prop_index (ctx, res_idx, rowid++);
                break;
        }
    } while ((qres = sqlite3_step (stmt)) && !done);
    
    freearr (colnames,colcount);
    sqlite3_finalize (stmt);
    return 1;
}

duk_ret_t sys_sql_rowsaffected (duk_context *ctx) {
    if (duk_get_top (ctx) != 1) return DUK_RET_TYPE_ERROR;
    int hdl = duk_get_int (ctx, 0);
    
    sql_descriptor *sql = sql_list_find (hdl);
    if (!sql) {
        duk_push_error_object (ctx, DUK_ERR_ERROR, "Handle not found");
        return duk_throw (ctx);
    }
    
    duk_push_int (ctx, sql->rowsaffected);
    return 1;
}

#endif
