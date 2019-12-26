#ifndef _CHANNEL_H
#define _CHANNEL_H 1

#include <stdbool.h>
#include <sys/types.h>
#include <sys/uio.h>
#include <unistd.h>

enum pipestatus {
    PIPE_CLOSED = 0,
    PIPE_LISTENING,
    PIPE_BUSY
};

#define PIPEMSG_BUSY "B"
#define PIPEMSG_FREE "F"
#define PIPEMSG_DATA "D"
#define PIPEMSG_EXIT "X"

#define MSGID_BUSY 'B'
#define MSGID_FREE 'F'
#define MSGID_DATA 'D'
#define MSGID_EXIT 'X'

#define PIPEFLAG_ISPARENT 0x01

typedef unsigned int pipeflag_t;

struct channelmsg {
    struct channelmsg   *nextmsg;
    pid_t                from;
    char                *data;
};

struct channelpipe {
    enum pipestatus      st;
    pid_t                pid;
    pipeflag_t           flags;
    int                  fdread;
    int                  fdwrite;
    unsigned int         msgsent; /* counters */
    unsigned int         msgrecv;
};

struct channel {
    unsigned int         alloc;
    struct channelpipe  *pipes;
    struct channelmsg   *firstmsg;
};
struct channelmsg *msg_create (size_t);
void msg_free (struct channelmsg *);
struct channel *channel_create (void);
void channel_add_pipe (struct channel *, pid_t, int, int);
void channel_fork_pipe (struct channel *, pid_t, int, int);
int channel_send (struct channel *, const char *);
int channel_broadcast (struct channel *, const char *);
struct channelmsg *channel_receive (struct channel *);
int channel_handle (struct channel *, bool);
void channel_exit (struct channel *);
#endif
