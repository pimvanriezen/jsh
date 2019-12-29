#ifndef _SYS_IO_H
#define _SYS_IO_H 1

duk_ret_t sys_io_open (duk_context *ctx);
duk_ret_t sys_io_close (duk_context *ctx);
duk_ret_t sys_io_read (duk_context *ctx);
duk_ret_t sys_io_write (duk_context *ctx);

#endif