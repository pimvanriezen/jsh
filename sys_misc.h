#ifndef _SYS_MISC_H
#define _SYS_MISC_H 1

duk_ret_t sys_setenv (duk_context *ctx);
duk_ret_t sys_getenv (duk_context *ctx);
duk_ret_t sys_winsize (duk_context *ctx);
duk_ret_t sys_getuid (duk_context *ctx);
duk_ret_t sys_getgid (duk_context *ctx);
duk_ret_t sys_getpid (duk_context *ctx);
duk_ret_t sys_uname (duk_context *ctx);
duk_ret_t sys_print (duk_context *ctx);
duk_ret_t sys_uptime (duk_context *ctx);
duk_ret_t sys_loadavg (duk_context *ctx);
duk_ret_t sys_kill (duk_context *ctx);
duk_ret_t sys_getpwnam (duk_context *ctx);
duk_ret_t sys_getpwuid (duk_context *ctx);
duk_ret_t sys_hostname (duk_context *ctx);
void sys_fs_init (void);

#endif
