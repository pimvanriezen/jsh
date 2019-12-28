#ifndef _SYS_FS_H
#define _SYS_FS_H 1

duk_ret_t sys_cd (duk_context *ctx);
duk_ret_t sys_cwd (duk_context *ctx);
duk_ret_t sys_dir (duk_context *ctx);
duk_ret_t sys_glob (duk_context *ctx);
duk_ret_t sys_read (duk_context *ctx);
duk_ret_t sys_write (duk_context *ctx);
duk_ret_t sys_stat (duk_context *ctx);
duk_ret_t sys_mkdir (duk_context *ctx);
duk_ret_t sys_chmod (duk_context *ctx);
duk_ret_t sys_chown (duk_context *ctx);

#endif
