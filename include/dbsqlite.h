#ifndef _SQLITE_H
#define _SQLITE_H 1

#ifdef WITH_SQLITE3

duk_ret_t sys_sql_open (duk_context *);
duk_ret_t sys_sql_close (duk_context *);
duk_ret_t sys_sql_query (duk_context *);
duk_ret_t sys_sql_rowsaffected (duk_context *);

#endif
#endif
