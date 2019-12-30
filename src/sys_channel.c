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
#include "duktape.h"
#include "channel.h"
#include "sys_channel.h"

// Reference for setting the process name
extern char **main_argv;

// ============================================================================
// GLOBAL list of channels
// ============================================================================
struct clist *CHANNELS;

// ============================================================================
// FUNCTION sys_chan_open
// ============================================================================
duk_ret_t sys_chan_open (duk_context *ctx) {
    int cid = clist_open (CHANNELS);
    duk_push_int (ctx, cid);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_send
// ============================================================================
duk_ret_t sys_chan_send (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    const char *data = duk_to_string (ctx, 1);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    if (! channel_send (c, data)) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    duk_push_boolean (ctx, 1);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_recv
// ============================================================================
duk_ret_t sys_chan_recv (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channelmsg *msg = NULL;
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    msg = channel_receive (c);
    if (! msg) {
        duk_push_boolean (ctx, 0);
        return 1;
    }

    duk_push_string (ctx, msg->data);
    msg_free (msg);
    return 1;    
}

// ============================================================================
// FUNCTION sys_chan_exit
// ============================================================================
duk_ret_t sys_chan_exit (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    channel_exit (c);
    while (channel_handle (c, false));
    duk_push_boolean (ctx, 1);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_close
// ============================================================================
duk_ret_t sys_chan_close (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    clist_close (CHANNELS, cid);
    duk_push_boolean (ctx, 1);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_stat
// ============================================================================
duk_ret_t sys_chan_stat (duk_context *ctx) {
    int i,j,pindex,cindex;
    struct channel *ch;
    struct channelmsg *msg;
    struct channelpipe *pipe;
    duk_idx_t ch_idx;
    duk_idx_t pipes_idx;
    duk_idx_t pipe_idx;
    duk_idx_t arr_idx = duk_push_array (ctx);
    
    cindex = 0;
    for (i=0; i<CHANNELS->alloc; ++i) {
        if (CHANNELS->list[i]) {
            ch = CHANNELS->list[i];
            channel_handle (ch, true);
            ch_idx = duk_push_object (ctx);
            duk_push_int (ctx, i);
            duk_put_prop_string (ctx, ch_idx, "id");
            j=0;
            msg = ch->firstmsg;
            while (msg) { j++; msg = msg->nextmsg; }
            duk_push_int (ctx, j);
            duk_put_prop_string (ctx, ch_idx, "queue");
            pipes_idx = duk_push_array (ctx);
            pindex = 0;
            for (j=0; j<ch->alloc; ++j) {
                pipe = &ch->pipes[j];
                if (pipe->pid == 0) continue;
                pipe_idx = duk_push_object (ctx);
                duk_push_number (ctx, pipe->pid);
                duk_put_prop_string (ctx, pipe_idx, "pid");
                switch (pipe->st) {
                    case PIPE_CLOSED:
                        duk_push_string (ctx, "closed");
                        break;
                    
                    case PIPE_LISTENING:
                        duk_push_string (ctx, "listening");
                        break;
                    
                    case PIPE_BUSY:
                        duk_push_string (ctx, "busy");
                        break;
                        
                    default:
                        duk_push_string (ctx, "unknown");
                        break;
                }
                duk_put_prop_string (ctx, pipe_idx, "st");       
                duk_push_number (ctx, pipe->msgsent);
                duk_put_prop_string (ctx, pipe_idx, "sent");
                duk_push_number (ctx, pipe->msgrecv);
                duk_put_prop_string (ctx, pipe_idx, "recv");
                duk_put_prop_index (ctx, pipes_idx, pindex++);
            }
            duk_put_prop_string (ctx, ch_idx, "pipes");
            duk_put_prop_index (ctx, arr_idx, cindex++);
        }
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_available
// ============================================================================
duk_ret_t sys_chan_available (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    if (channel_hasdata (c)) duk_push_boolean (ctx, 1);
    else duk_push_boolean (ctx, 0);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_isempty
// ============================================================================
duk_ret_t sys_chan_isempty (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    if (channel_empty (c)) duk_push_boolean (ctx, 1);
    else duk_push_boolean (ctx, 0);
    return 1;
}

// ============================================================================
// FUNCTION sys_chan_senderror
// ============================================================================
duk_ret_t sys_chan_senderror (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        return 0;
    }
    const char *errstr = duk_to_string (ctx, 1);
    channel_senderror (c, errstr);
    return 0;
}

// ============================================================================
// FUNCTION sys_chan_error
// ============================================================================
duk_ret_t sys_chan_error (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    if (c->error == NULL) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    duk_push_string (ctx, c->error);
    return 1;
}

// ============================================================================
// FUNCTION sys_go
// ============================================================================
duk_ret_t sys_go (duk_context *ctx) {
    pid_t pid;
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int cid = duk_get_int (ctx, 0);
    struct channel *c = clist_get (CHANNELS, cid);
    if (! c) {
        fprintf (stderr, "%% Channel %i not found\n", cid);
        duk_push_boolean (ctx, 0);
        return 1;
    }
    
    switch (pid = channel_fork (c)) {
        case 0:
            strcpy (main_argv[0], "jsh-coroutine");
            duk_call (ctx, 0);
            exit (0);
        
        case -1:
            fprintf (stderr, "%% Fork error\n");
            duk_push_boolean (ctx, 0);
            return 1;
    }
    duk_push_int (ctx, pid);
    return 1;
}

// ============================================================================
// FUNCTION sys_channel_init
// ============================================================================
void sys_channel_init (void) {
    CHANNELS = clist_create();
}
