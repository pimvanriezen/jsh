#ifndef _SYS_RUN_H
#define _SYS_RUN_H 1

// ============================================================================
// PROTOTYPES
// ============================================================================
duk_ret_t sys_run (duk_context *ctx);
duk_ret_t sys_runconsole (duk_context *ctx);
duk_ret_t sys_runpipe (duk_context *ctx);
duk_ret_t sys_closepipe (duk_context *ctx);

#endif
