#ifndef _CHANNEL_H
#define _CHANNEL_H 1

#include <stdbool.h>
#include <sys/types.h>
#include <sys/uio.h>
#include <unistd.h>
#include <pthread.h>

// ----------------------------------------------------------------------------
// States of an individual pipe within a channel
// ----------------------------------------------------------------------------
enum pipestatus {
    PIPE_CLOSED = 0,
    PIPE_LISTENING,
    PIPE_BUSY
};

// ----------------------------------------------------------------------------
// Channel communication constants
// ----------------------------------------------------------------------------
#define PIPEMSG_BUSY  "B"
#define PIPEMSG_FREE  "F"
#define PIPEMSG_DATA  "D"
#define PIPEMSG_ERROR "E"
#define PIPEMSG_EXIT  "X"

#define MSGID_BUSY  'B'
#define MSGID_FREE  'F'
#define MSGID_DATA  'D'
#define MSGID_ERROR 'E'
#define MSGID_EXIT  'X'

// ----------------------------------------------------------------------------
// Flags for channel pipes
// ----------------------------------------------------------------------------
#define PIPEFLAG_ISPARENT 0x01

typedef unsigned int pipeflag_t;

// ----------------------------------------------------------------------------
// A structure representing a message, containing its data and a reference
// to the pid that sent it.
// ----------------------------------------------------------------------------
struct channelmsg {
    struct channelmsg   *nextmsg;
    pid_t                from;
    char                *data;
};

// ----------------------------------------------------------------------------
// Represents a communication pipe within the channel with one specific
// coroutine/subprocess.
// ----------------------------------------------------------------------------
struct channelpipe {
    enum pipestatus      st;
    pid_t                pid;
    pipeflag_t           flags;
    int                  fdread;
    int                  fdwrite;
    unsigned int         msgsent; /* counters */
    unsigned int         msgrecv;
};

// ----------------------------------------------------------------------------
// Represents an individual channel
// ----------------------------------------------------------------------------
struct channel {
    unsigned int         alloc;
    const char          *error;
    struct channelpipe  *pipes;
    struct channelmsg   *firstmsg;
};

// ----------------------------------------------------------------------------
// Maps channels to numeric channel-ids for convenience on the js-side
// ----------------------------------------------------------------------------
struct clist {
    int                  alloc;
    struct channel     **list;
};

// ============================================================================
// PROTOTYPES
// ============================================================================
struct channelmsg   *msg_create (size_t);
void                 msg_free (struct channelmsg *);
void                 channel_init (void);
void                 channel_lock (void);
void                 channel_unlock (void);
struct channel      *channel_create (void);
void                 channel_add_pipe (struct channel *, pid_t, int, int);
void                 channel_fork_pipe (struct channel *, pid_t, int, int);
int                  channel_send (struct channel *, const char *);
int                  channel_broadcast (struct channel *, const char *);
struct channelmsg   *channel_receive (struct channel *);
int                  channel_handle (struct channel *, bool);
void                 channel_exit (struct channel *);
void                 channel_destroy (struct channel *);
pid_t                channel_fork (struct channel *);
void                 channel_seterror (struct channel *, const char *);
void                 channel_senderror (struct channel *, const char *);
bool                 channel_hasdata (struct channel *);
bool                 channel_empty (struct channel *);

struct clist        *clist_create (void);
struct channel      *clist_get (struct clist *, int idx);
int                  clist_open (struct clist *);
void                 clist_close (struct clist *, int idx);

#endif
