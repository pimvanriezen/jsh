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
#include <signal.h>
#include "duktape.h"
#include "sys_run.h"
#include "textbuffer.h"
#include "fd.h"

extern char *mystrdup (const char *);

// ============================================================================
// FUNCTION sys_run
// ----------------
// Spawns a process running a unix command. Its standard in- and outputs
// are redirected to a pipe, which is used to receive the command's output
// into a buffer that get ultimately turned into a javascript string, and
// optionally to send data to the child process stdin.
// ============================================================================
duk_ret_t sys_run (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int tocmdpipe[2];
    int fromcmdpipe[2];
    int i;
    pid_t pid;
    int fdin;
    int fdout;
    int numarg = 0;
    char **args = NULL;
    const char *command = duk_to_string (ctx, 0);
    const char *senddata = NULL;
    
    // Get the array length of arguments[0]
    duk_get_prop_string(ctx,1,"length");
    numarg = duk_get_int(ctx,-1);
    duk_pop(ctx);
    
    // We need two extra arguments, one for the command name,
    // and one for the terminating NULL that execvp wants.
    args = (char **) calloc (sizeof(char*),numarg+2);
    
    // Copy the arguments from the array
    args[0] = mystrdup (command);
    for (i=0; i<numarg; ++i) {
        duk_get_prop_index(ctx,1,i);
        args[i+1] = mystrdup(duk_to_string(ctx,-1));
        duk_pop(ctx);
    }
    args[i+1] = NULL;
    
    // If we have a second argument, it means there's data to be sent
    // into the child process stdin.
    if (duk_get_top (ctx) > 2) senddata = duk_to_string (ctx, 2);
    
    // Set up unix pipes
    fd_pipe (tocmdpipe);
    fd_pipe (fromcmdpipe);
    fd_retain (tocmdpipe[0]);
    fd_retain (fromcmdpipe[1]);
    
    // Spawn
    switch (pid = fd_fork()) {
        case -1:
            fd_close (tocmdpipe[0]);
            fd_close (tocmdpipe[1]);
            fd_close (fromcmdpipe[0]);
            fd_close (fromcmdpipe[1]);
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            return 0;
            
        case 0:
            // We're the new process here.
            fd_close (0);
            fd_close (1);
            fd_close (2);
            fd_dup2 (tocmdpipe[0], 0);
            fd_dup2 (fromcmdpipe[1], 1);
            fd_dup2 (fromcmdpipe[1], 2);
            execvp (command, args);
            printf ("Exec failed: %s", strerror (errno));
            exit (1);
    }
    
    // Close the ends of the pipe that aren't ours.
    fd_close (fromcmdpipe[1]);
    fd_close (tocmdpipe[0]);
    
    // For clarity
    fdout = tocmdpipe[1];
    fdin = fromcmdpipe[0];
    
    // Send any data that needs to be sent.
    if (senddata) {
        if (write (fdout, senddata, strlen(senddata)) != strlen(senddata)) {
            // write error, bail out.
            fd_close (fdout);
            fd_close (fdin);
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            duk_push_boolean (ctx, 0);
            return 1;
        }
    }

    fd_close (fdout);
    
    // Free stuff we no longer need
    for (i=0; i<(numarg+1);++i) free (args[i]);
    free (args);
    
    // Now let's process the output
    int retstatus;
    ssize_t rdsz;
    size_t bufsz = 1024;
    size_t bufpos = 0;
    char *buf = (char *) malloc (1024);
    buf[0] = 0;
    
    while (1) {
        if (bufpos+256 >= bufsz) {
            bufsz = 2* bufsz;
            buf = (char *) realloc (buf, bufsz);
            if (! buf) break;
        }
        rdsz = read (fdin, buf+bufpos, 256);
        if (rdsz == 0) break;
        if (rdsz<0) {
            if (errno == EAGAIN) continue;
            if (errno == EINTR) continue;
            break;
        }
        bufpos += rdsz;
        buf[bufpos] = 0;
    }
    
    fd_close (fdin);
    
    // Clean up the process.
    waitpid (pid, &retstatus, 0);

    // Check if it failed on us
    if (WEXITSTATUS(retstatus) != 0) {
        duk_push_boolean (ctx, 0);
    }
    else {
        if (*buf) {
            duk_push_string (ctx, buf);
        }
        else {
            duk_push_boolean (ctx, 1);
        }
    }
    free (buf);
    return 1;
}

// ============================================================================
// FUNCTION sys_runconsole
// -----------------------
// Like sys_run, this spawns a child process, but its in- and output stay
// connected to the foreground console, making this a much simpler job.
// ============================================================================
duk_ret_t sys_runconsole (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int i;
    pid_t pid;
    int numarg = 0;
    char **args = NULL;
    const char *command = duk_to_string (ctx, 0);
    duk_get_prop_string(ctx,1,"length");
    numarg = duk_get_int(ctx,-1);
    duk_pop(ctx);
    
    args = (char **) calloc (sizeof(char*),numarg+2);
    args[0] = mystrdup (command);
    for (i=0; i<numarg; ++i) {
        duk_get_prop_index(ctx,1,i);
        args[i+1] = mystrdup(duk_to_string(ctx,-1));
        duk_pop(ctx);
    }
    args[i+1] = NULL;
    
    switch (pid = fd_fork()) {
        case -1:
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            return 0;
            
        case 0:
            execvp (command, args);
            fprintf (stderr, "Exec failed: %s", strerror (errno));
            exit (1);
    }
    
    for (i=0; i<(numarg+1);++i) free (args[i]);
    free (args);
    int retstatus;
    waitpid (pid, &retstatus, 0);

    if (WEXITSTATUS(retstatus) != 0) {
        duk_push_boolean (ctx, 0);
    }
    else {
        duk_push_boolean (ctx, 1);
    }
    return 1;
}

// ============================================================================
// FUNCTION sys_runpipe
// --------------------
// Like sys_run, this spawns a child process, but the raw pipe connected to
// the child process is returned instead.
// ============================================================================
duk_ret_t sys_runpipe (duk_context *ctx) {
    if (duk_get_top (ctx) < 2) return DUK_RET_TYPE_ERROR;
    int tocmdpipe[2];
    int fromcmdpipe[2];
    int i;
    pid_t pid;
    int fdin;
    int fdout;
    int numarg = 0;
    char **args = NULL;
    const char *command = duk_to_string (ctx, 0);
    const char *senddata = NULL;
    
    // Get the array length of arguments[0]
    duk_get_prop_string(ctx,1,"length");
    numarg = duk_get_int(ctx,-1);
    duk_pop(ctx);
    
    // We need two extra arguments, one for the command name,
    // and one for the terminating NULL that execvp wants.
    args = (char **) calloc (sizeof(char*),numarg+2);
    
    // Copy the arguments from the array
    args[0] = mystrdup (command);
    for (i=0; i<numarg; ++i) {
        duk_get_prop_index(ctx,1,i);
        args[i+1] = mystrdup(duk_to_string(ctx,-1));
        duk_pop(ctx);
    }
    args[i+1] = NULL;
    
    // If we have a second argument, it means there's data to be sent
    // into the child process stdin.
    if (duk_get_top (ctx) > 2) senddata = duk_to_string (ctx, 2);
    
    // Set up unix pipes
    fd_pipe (tocmdpipe);
    fd_pipe (fromcmdpipe);
    fd_retain (tocmdpipe[0]);
    fd_retain (fromcmdpipe[1]);
    
    // Spawn
    switch (pid = fd_fork()) {
        case -1:
            fd_close (tocmdpipe[0]);
            fd_close (tocmdpipe[1]);
            fd_close (fromcmdpipe[0]);
            fd_close (fromcmdpipe[1]);
            for (i=0; i<(numarg+1);++i) free (args[i]);
            free (args);
            return 0;
            
        case 0:
            // We're the new process here.
            fd_close (0);
            fd_close (1);
            fd_close (2);
            fd_dup2 (tocmdpipe[0], 0);
            fd_dup2 (fromcmdpipe[1], 1);
            fd_dup2 (fromcmdpipe[1], 2);
            execvp (command, args);
            printf ("Exec failed: %s", strerror (errno));
            exit (1);
    }
    
    // Close the ends of the pipe that aren't ours.
    fd_close (fromcmdpipe[1]);
    fd_close (tocmdpipe[0]);
    
    // For clarity
    fdout = tocmdpipe[1];
    fdin = fromcmdpipe[0];
    
    duk_push_array (ctx);
    duk_push_int (ctx, fdin);
    duk_put_prop_index (ctx, -2, 0);
    duk_push_int (ctx, fdout);
    duk_put_prop_index (ctx, -2, 1);
    duk_push_int (ctx, pid);
    duk_put_prop_index (ctx, -2, 2);
    return 1;
}

duk_ret_t sys_closepipe (duk_context *ctx) {
    if (duk_get_top (ctx) < 1) return DUK_RET_TYPE_ERROR;
    pid_t pid = duk_get_int (ctx, 0);
    if (! pid) {
        duk_push_boolean (ctx, 0);
        return 1;
    }
    kill (pid, SIGTERM);
    int ret;
    waitpid (pid, &ret, 0);
    duk_push_int (ctx, WEXITSTATUS(ret));
    return 1;
}
