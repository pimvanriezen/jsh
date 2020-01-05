#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include <stdint.h>  /* Assume C99/C++11 with linenoise. */
#include <fcntl.h>
#include <unistd.h>
#include <sys/errno.h>
#include "textbuffer.h"
#include "fd.h"

// ============================================================================
// FUNCTION textbuffer_free
// ============================================================================
void textbuffer_free (struct textbuffer *t) {
    if (! t) return;
    if (t->alloc) free (t->alloc);
    free (t);
}

// ============================================================================
// FUNCTION textbuffer_load_fd
// ---------------------------
// Creates a new textbuffer, and fills it with all the data that could be
// read from the passed filedescriptor.
// ============================================================================
struct textbuffer *textbuffer_load_fd (int filno) {
    char buffer[1024];
    struct textbuffer *t = textbuffer_alloc();
    ssize_t rdsz = 0;
    while ((rdsz = read (filno, buffer, 1024)) != 0) {
        if (rdsz<0) {
            if (errno == EAGAIN || errno == EINTR) continue;
            break;
        }
        textbuffer_add_data (t, buffer, rdsz);
    }
    return t;
}

// ============================================================================
// FUNCTION textbuffer_load
// ------------------------
// Reads a file into a freshly created textbuffer, and return the result.
// ============================================================================
struct textbuffer *textbuffer_load (const char *fname) {
    int filno;
    filno = fd_open (fname, O_RDONLY);
    if (filno<0) {
        return NULL;
    }
    
    struct textbuffer *t = textbuffer_load_fd (filno);
    fd_close (filno);
    return t;
}

// ============================================================================
// FUNCTION add_c
// --------------
// Adds a single character to the textbuffer without a trailing NUL byte.
// Only call this if you're absolutely sure that more data will follow
// and you end your streak with any of the other calls that *does* add a NUL
// byte.
// ============================================================================
void textbuffer_add_c (struct textbuffer *t, char c) {
    if ((t->wpos +2) > t->size) {
        size_t newsz = t->size;
        if (newsz < 16384) newsz = 2 * t->size;
        else newsz = t->size + 16384;
        t->alloc = (char *) realloc (t->alloc, newsz);
        if (! t->alloc) {
            fprintf (stderr, "%% FATAL allocation error\n");
            exit (1);
        }
        t->size = newsz;
    }
    t->alloc[t->wpos++] = c;
}

// ============================================================================
// FUNCTION textbuffer_add
// -----------------------
// Adds a single character to the textbuffer, and sets the new trailing
// NUL byte.
// ============================================================================
void textbuffer_add (struct textbuffer *t, char c) {
    textbuffer_add_c (t, c);
    t->alloc[t->wpos] = 0;
}

// ============================================================================
// FUNCTION textbuffer_add_str
// ---------------------------
// Adds a C-string to the buffer.
// ============================================================================
void textbuffer_add_str (struct textbuffer *t, const char *dt) {
    const char *p = dt;
    while (*p) {
        textbuffer_add_c (t, *p);
        ++p;
    }
    t->alloc[t->wpos] = 0;
}

// ============================================================================
// FUNCTION textbuffer_add_data
// ----------------------------
// Adds an arbitrarily sized bit of data to the buffer.
// ============================================================================
void textbuffer_add_data (struct textbuffer *t, const char *dt, size_t sz) {
    size_t origsize = t->size;
    while ((t->wpos + sz + 2) > t->size) {
        if (t->size < 16384) t->size = 2*t->size;
        else t->size = t->size + 16384;
    }
    if (t->size > origsize) {
        t->alloc = (char *) realloc (t->alloc, t->size);
        if (! t->alloc) {
            fprintf (stderr, "%% FATAL allocation error\n");
            exit (1);
        }
    }
    memcpy (t->alloc + t->wpos, dt, sz);
    t->wpos += sz;
    t->alloc[t->wpos] = 0;
}

// ============================================================================
// FUNCTION textbuffer_alloc
// ============================================================================
struct textbuffer *textbuffer_alloc (void) {
    struct textbuffer *t;
    t = (struct textbuffer *) calloc (sizeof(struct textbuffer),1);
    t->alloc = (char *) malloc ((size_t) 1024);
    t->size = 1024;
    return t;
}
