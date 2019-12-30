#ifndef _SYS_CHANNEL_H
#define _SYS_CHANNEL_H 1

duk_ret_t sys_chan_open (duk_context *ctx);
duk_ret_t sys_chan_send (duk_context *ctx);
duk_ret_t sys_chan_recv (duk_context *ctx);
duk_ret_t sys_chan_exit (duk_context *ctx);
duk_ret_t sys_chan_close (duk_context *ctx);
duk_ret_t sys_chan_stat (duk_context *ctx);
duk_ret_t sys_chan_available (duk_context *ctx);
duk_ret_t sys_chan_isempty (duk_context *ctx);
duk_ret_t sys_chan_senderror (duk_context *ctx);
duk_ret_t sys_chan_error (duk_context *ctx);
duk_ret_t sys_go (duk_context *ctx);
void sys_channel_init (void);

#endif
