#include "channel.h"
#include <sys/select.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <signal.h>

// ============================================================================
// FUNCTION channel_create
// ============================================================================
struct channel *channel_create (void) {
    struct channel *res;
    res = malloc (2 * sizeof (struct channelpipe));
    res->error = NULL;
    res->alloc = 1;
    res->firstmsg = NULL;
    res->pipes = malloc (sizeof (struct channelpipe));
    res->pipes[0].st = PIPE_CLOSED;
    res->pipes[0].pid = 0;
    res->pipes[0].flags = 0;
    res->pipes[0].fdread = 0;
    res->pipes[0].fdwrite = 0;
    res->pipes[0].msgsent = 0;
    res->pipes[0].msgrecv = 0;
    return res;
}

// ============================================================================
// FUNCTION channel_add_pipe
// -------------------------
// Adds a pipe to the channel. Typically called in the parent process
// context of a goroutine. Finds a closed pipe in the channel, or
// increases the pool of channelpipes.
// ============================================================================
void channel_add_pipe (struct channel *c, pid_t pid, int fdread, int fdwrite) {
    unsigned int crsr = 0;
    unsigned int newalloc = 0;
    while (crsr < c->alloc) {
        if (c->pipes[crsr].st == PIPE_CLOSED) {
            c->pipes[crsr].st = PIPE_BUSY;
            c->pipes[crsr].flags = 0;
            c->pipes[crsr].fdread = fdread;
            c->pipes[crsr].fdwrite = fdwrite;
            c->pipes[crsr].pid = pid;
            c->pipes[crsr].msgsent = 0;
            c->pipes[crsr].msgrecv = 0;
            return;
        }
        crsr++;
    }
    if (c->alloc < 256) newalloc = c->alloc * 2;
    else newalloc = c->alloc + 128;
    
    c->pipes = realloc (c->pipes, (newalloc+1) * sizeof (struct channelpipe));
    if (! c->pipes) {
        exit (666);
    }

    for (crsr = c->alloc + 1; crsr<=newalloc; ++crsr) {
        c->pipes[crsr].st = PIPE_CLOSED;
        c->pipes[crsr].fdread = 0;
        c->pipes[crsr].fdwrite = 0;
        c->pipes[crsr].flags = 0;
    }
    
    c->pipes[c->alloc].st = PIPE_BUSY;
    c->pipes[c->alloc].fdread = fdread;
    c->pipes[c->alloc].fdwrite = fdwrite;
    c->pipes[c->alloc].pid = pid;
    c->pipes[c->alloc].msgsent = 0;
    c->pipes[c->alloc].msgrecv = 0;
    c->pipes[c->alloc].flags = 0;
    c->alloc = newalloc;
}

// ============================================================================
// FUNCTION channel_fork_pipe
// --------------------------
// If a goroutine is created, the child process closes all filedescriptors
// except its own end of the pipe. The channel in the forked context
// should only contain *its* end of the pipe.
// ============================================================================
void channel_fork_pipe (struct channel *c, pid_t pid, int fdread, int fdwrite) {
    int i=0;
    for (i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) {
            close (c->pipes[i].fdread);
            close (c->pipes[i].fdwrite);
        }
    }
    free (c->pipes);
    c->pipes = malloc (2*sizeof (struct channelpipe));
    c->pipes[0].st = PIPE_LISTENING;
    c->pipes[0].flags = PIPEFLAG_ISPARENT;
    c->pipes[0].fdread = fdread;
    c->pipes[0].fdwrite = fdwrite;
    c->pipes[0].pid = pid;
    c->pipes[0].msgsent = 0;
    c->pipes[0].msgrecv = 0;
    c->alloc = 1;
}

// ============================================================================
// FUNCTION channel_send
// ---------------------
// If there's a pipe in state PIPE_LISTENING, get the first one available,
// set its state to PIPE_BUSY and send it our own message. If none
// are currently listening, go into the handle loop that will wait for
// messages from any pipe before returning, then try again to see if
// a pipe became available, otherwise rinse and repeat. 
// 
// Regardless of available pipes, the handle function needs to be called
// to allow for PIPE_EXIT messages to flow in.
// 
// Parent processes will normally be automatically in PIPE_LISTENING state,
// since if it's busy it can't send any new messages, so the coroutine
// might as well sleep at this point if its writing data to the parent
// blocks.
// ============================================================================
int channel_send (struct channel *c, const char *msg) {
    int i=0;
    int found=0;
    size_t msgsz = strlen (msg)+1; /* include nul-byte */
    size_t szsz = sizeof (size_t);
    size_t wsz;
    while (1) {
        found = 0;
        for (i=0; i<c->alloc; ++i) {
            if (c->pipes[i].st != PIPE_CLOSED) {
                found++;
                if (c->pipes[i].st == PIPE_LISTENING) {
                    if (! (c->pipes[i].flags & PIPEFLAG_ISPARENT)) {
                        c->pipes[i].st = PIPE_BUSY;
                    }
                    wsz = write (c->pipes[i].fdwrite, PIPEMSG_DATA, 1);
                    if (wsz) wsz = write (c->pipes[i].fdwrite, &msgsz, szsz);
                    if (wsz) wsz = write (c->pipes[i].fdwrite, msg, msgsz);
                    if (wsz == 0) {
                        c->pipes[i].st = PIPE_CLOSED;
                        close (c->pipes[i].fdread);
                        close (c->pipes[i].fdwrite);
                    }
                    else {
                        c->pipes[i].msgsent++;
                        return 1;
                    }
                }
            }
        }

        if (! found) return 0;
        channel_handle (c, false);
    }
}

// ============================================================================
// FUNCTION channel_senderror
// ============================================================================
void channel_senderror (struct channel *c, const char *msg) {
    size_t msgsz = strlen (msg)+1; /* include nul-byte */
    size_t szsz = sizeof (size_t);
    size_t wsz;
    
    if (c->pipes[0].st == PIPE_CLOSED) return;
    if ((c->pipes[0].flags & PIPEFLAG_ISPARENT) == 0) return;
    wsz = write (c->pipes[0].fdwrite, PIPEMSG_ERROR, 1);
    if (wsz) wsz = write (c->pipes[0].fdwrite, &msgsz, szsz);
    if (wsz) wsz = write (c->pipes[0].fdwrite, msg, msgsz);
    if (wsz == 0) {
        c->pipes[0].st = PIPE_CLOSED;
        close (c->pipes[0].fdread);
        close (c->pipes[0].fdwrite);
    }
}

// ============================================================================
// FUNCTION channel_hasdata
// ============================================================================
bool channel_hasdata (struct channel *c) {
    channel_handle (c, true);
    return (c->firstmsg ? true : false);
}

// ============================================================================
// FUNCTION channel_empty
// ============================================================================
bool channel_empty (struct channel *c) {
    for (int i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) return false;
    }
    return true;
}

// ============================================================================
// FUNCTION channel_broadcast
// --------------------------
// Sends a message to *everybody*. Does not take busy state into account,
// so theoretically it could block for a bit, depending on how big a queue
// the coroutine has built up on its channel, and what the maximum buffer
// size is the OS keeps for pipes.
// ============================================================================
int channel_broadcast (struct channel *c, const char *msg) {
    int i=0;
    int found=0;
    size_t msgsz = strlen (msg);
    size_t szsz = sizeof (size_t);
    size_t wsz;
    for (i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) {
            found++;
            wsz = write (c->pipes[i].fdwrite, PIPEMSG_DATA, 1);
            if (wsz) wsz = write (c->pipes[i].fdwrite, &msgsz, szsz);
            if (wsz) wsz = write (c->pipes[i].fdwrite, msg, msgsz);
            if (wsz == 0) {
                c->pipes[i].st = PIPE_CLOSED;
                close (c->pipes[i].fdread);
                close (c->pipes[i].fdwrite);
            }
        }
    }

    return found;
}

// ============================================================================
// FUNCTION channel_receive
// ------------------------
// Will do a non-blocking run past the handle function. Then it will
// pick up the first message from the receive queue, and return it.
// If the receive queue is empty, the handle function is called in
// blocking mode to wait for messages. If there are no open pipes,
// returns NULL immediately. Otherwise returns an allocated string
// that the receiver should free().
// ============================================================================
struct channelmsg *channel_receive (struct channel *c) {
    /* If we have a parent pipe, we need to send it a PIPEMSG_FREE,
       then wait for a message. If we get a PIPEMSG_EXIT, we
       return NULL. Otherwise, return the message and send back
       PIPEMSG_BUSY.
       
       If we have child pipes, we go through handle(), either non-blocking
       if there are already messages in the queue, or blocking if there
       are none. Then we return the top message of the queue.
       
       If the channel has no open pipes, return NULL.
    */
    struct channelmsg *msg;
    
    if (! c->firstmsg) {
        if (c->pipes[0].flags & PIPEFLAG_ISPARENT) {
            if (c->pipes[0].st != PIPE_CLOSED) {
                write (c->pipes[0].fdwrite, PIPEMSG_FREE, 1);
            }
        }
        while (! c->firstmsg) {
            if (! channel_handle (c, false)) {
                return NULL;
            }
        }
    }
    else {
        channel_handle (c, true);
    }
    
    msg = c->firstmsg;
    c->firstmsg = msg->nextmsg;
    msg->nextmsg = NULL;
    
    if (c->pipes[0].flags & PIPEFLAG_ISPARENT) {
        if (c->pipes[0].st != PIPE_CLOSED) {
            write (c->pipes[0].fdwrite, PIPEMSG_BUSY, 1);
        }
    }
    
    return msg;
}

// ============================================================================
// FUNCTION msg_create
// ============================================================================
struct channelmsg *msg_create (size_t len) {
    struct channelmsg *res = calloc (sizeof(struct channelmsg),1);
    res->data = calloc (len+1,1);
    return res;
}

// ============================================================================
// FUNCTION msg_free
// ============================================================================
void msg_free (struct channelmsg *msg) {
    if (msg->data) free (msg->data);
    free (msg);
}

// ============================================================================
// FUNCTION channel_handle
// ============================================================================
int channel_handle (struct channel *c, bool nonblock) {
    /* Make a select-loop over all the readfds of the channel's
       pipes, either blocking or nonblocking. For every readfd
       that has data waiting, read a 1 byte PIPEMSG. If it's
       PIPEMSG_BUSY, PIPEMSG_FREE, update the status.
       
       If it's PIPEMSG_EXIT, close the pipe and set the status to
       PIPE_CLOSED.
       
       If it's PIPEMSG_DATA, read 4 bytes for a size, then read in
       the data, and add it as a channelmsg to the readqueue.
       
       Do a lazy waitpid() to prevent zombii.
    */
    struct timeval tv;
    fd_set fds;
    size_t sz;
    size_t msgsz;
    size_t szsz = sizeof(size_t);
    int found=0;
    int i=0;
    int max=0;
    struct channelmsg *msg = NULL;
    char *errstr = NULL;
    
    // Collect all the relevant filedescriptors to select on
    FD_ZERO (&fds);
    for (i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) {
            found++;
            FD_SET (c->pipes[i].fdread, &fds);
            if (c->pipes[i].fdread > max) max = c->pipes[i].fdread;
        }
    }
    if (! found) return 0;
    
    tv.tv_sec = 0;
    tv.tv_usec = 0;
    
    if (select (max+1, &fds, NULL, NULL, nonblock ? &tv : NULL) > 0) {
        // Now go over all the pipes again and find a match from select
        for (i=0; i<c->alloc; ++i) {
            if (c->pipes[i].st == PIPE_CLOSED) continue;
            
            if (FD_ISSET (c->pipes[i].fdread, &fds)) {
                // A match. First read in the message type.
                char msgtype = 0;
                sz = read (c->pipes[i].fdread, &msgtype, 1);
                if (sz == 0) msgtype = MSGID_EXIT;
                
                switch (msgtype) {
                    case MSGID_BUSY: // Propagate to status
                        c->pipes[i].st = PIPE_BUSY; break;
                    
                    case MSGID_FREE: // Propagate to status
                        c->pipes[i].st = PIPE_LISTENING; break;
                        
                    case MSGID_EXIT: // Mark connection as ended
                        c->pipes[i].st = PIPE_CLOSED;
                        close (c->pipes[i].fdread);
                        close (c->pipes[i].fdwrite);
                        break;
                    
                    case MSGID_DATA: // A message, oh boy
                        sz = read (c->pipes[i].fdread, &msgsz, szsz);
                        if (sz) {
                            msg = msg_create (msgsz);
                            msg->from = c->pipes[i].pid;
                            sz = read (c->pipes[i].fdread, msg->data, msgsz);
                        }
                        if (sz != 0) {
                            msg->nextmsg = c->firstmsg;
                            c->firstmsg = msg;
                            c->pipes[i].msgrecv++;
                            msg = NULL;
                        }
                        else {
                            // Discard empty message. Yeah, theoretically
                            // a message of absolutely nothing still conveys
                            // information, but on the other hand, don't be
                            // a jerk.
                            msg_free (msg);
                            msg = NULL;
                        }
                        break;
                        
                    case MSGID_ERROR: // An error event, boo, hiss.
                        sz = read (c->pipes[i].fdread, &msgsz, szsz);
                        if (sz) {
                            errstr = malloc (msgsz);
                            sz = read (c->pipes[i].fdread, errstr, msgsz);
                            if (sz) channel_seterror (c, errstr);
                            else free ((void*) errstr);
                        }
                        break;
                }
            }
        }
    }
    
    waitpid (-1, &i, WNOHANG);
    return 1;
}

// ============================================================================
// FUNCTION channel_exit
// ============================================================================
void channel_exit (struct channel *c) {
    if (! c) return;
    /* Send a PIPEMSG_EXIT to all open pipes */
    int i=0;
    for (i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) {
            write (c->pipes[i].fdwrite, PIPEMSG_EXIT, 1);
        }
    }
}

// ============================================================================
// FUNCTION channel_fork
// ============================================================================
pid_t channel_fork (struct channel *c) {
    int togopipe[2];
    int fromgopipe[2];
    pid_t parentpid = getpid();
    pid_t pid;
    int i;
    
    pipe (togopipe);
    pipe (fromgopipe);
    
    switch ((pid = fork())) {
        case 0:
            close (0);
            close (1);
            close (2);
            open ("/dev/null",O_RDONLY);
            open ("/dev/null",O_WRONLY);
            open ("/dev/null",O_WRONLY);
            for (i=3; i<1023; ++i) {
                if ((i!=togopipe[0])&&(i!=fromgopipe[1])) close (i);
            }
            channel_fork_pipe (c, parentpid, togopipe[0], fromgopipe[1]);
            return 0;
            
        case -1:
            return -1;
            
        default:
            close (togopipe[0]);
            close (fromgopipe[1]);
            channel_add_pipe (c, pid, fromgopipe[0], togopipe[1]);
            return pid;
    }
}

// ============================================================================
// FUNCTION channel_destroy
// ============================================================================
void channel_destroy (struct channel *c) {
    if (! c) return;
    struct channelmsg *msg, *nextmsg;
    int i;
    int st;
    
    for (i=0; i<c->alloc; ++i) {
        if (c->pipes[i].st != PIPE_CLOSED) {
            if ((c->pipes[i].flags & PIPEFLAG_ISPARENT) == 0) {
                if (kill (c->pipes[i].pid, SIGKILL) == 0) {
                    waitpid (c->pipes[i].pid, &st, 0);
                }
            }
            close (c->pipes[i].fdread);
            close (c->pipes[i].fdwrite);
        }
    }
    
    free (c->pipes);
    msg = c->firstmsg;
    while (msg) {
        nextmsg = msg->nextmsg;
        msg_free (msg);
        msg = nextmsg;
    }
    
    if (c->error) free ((void*) c->error);
    
    free (c);
}

// ============================================================================
// FUNCTION channel_seterror
// ============================================================================
void channel_seterror (struct channel *c, const char *err) {
    if (! c) return;
    if (c->error) free ((void *) c->error);
    c->error = err;
}

// ============================================================================
// FUNCTION clist_create
// ---------------------
// The clist struct is around to give userland a simple numeric 'channel
// descriptor' to pass along with any channel-related calls.
// ============================================================================
struct clist *clist_create (void) {
    struct clist *res = calloc (sizeof (struct clist), 1);
    res->alloc = 1;
    res->list = malloc (sizeof (struct channel **));
    res->list[0] = NULL;
    return res;
}

// ============================================================================
// FUNCTION clist_get
// ============================================================================
struct channel *clist_get (struct clist *c, int idx) {
    if (idx >= c->alloc) return NULL;
    return c->list[idx];
}

// ============================================================================
// FUNCTION clist_open
// ============================================================================
int clist_open (struct clist *c) {
    int i;
    for (i=0; i<c->alloc; ++i) {
        if (c->list[i] == NULL) break;
    }
    if (i >= c->alloc) {
        c->list = realloc (c->list, i+1 * sizeof (struct channel*));
        c->alloc++;
    }
    c->list[i] = channel_create();
    return i;
}

// ============================================================================
// FUNCTION clist_close
// ============================================================================
void clist_close (struct clist *c, int idx) {
    if (idx >= c->alloc) return;
    if (! c->list[idx]) return;
    channel_destroy (c->list[idx]);
    c->list[idx] = NULL;
}
