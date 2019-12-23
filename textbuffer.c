#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include <stdint.h>  /* Assume C99/C++11 with linenoise. */
#include <fcntl.h>
#include <unistd.h>
#include "textbuffer.h"

void textbuffer_free (struct textbuffer *t) {
    if (t->alloc) free (t->alloc);
    free (t);
}

struct textbuffer *textbuffer_load (const char *fname) {
    int filno;
    char buffer[1024];
    struct textbuffer *t = textbuffer_alloc();
    filno = open (fname, O_RDONLY);
    if (filno<0) {
        textbuffer_free (t);
        return NULL;
    }
    
    size_t rdsz = 0;
    while ((rdsz = read (filno, buffer, 1024)) > 0) {
        textbuffer_add_data (t, buffer, rdsz);
    }
    close (filno);
    return t;
}

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

void textbuffer_add (struct textbuffer *t, char c) {
    textbuffer_add_c (t, c);
    t->alloc[t->wpos] = 0;
}

void textbuffer_add_str (struct textbuffer *t, const char *dt) {
    const char *p = dt;
    while (*p) {
        textbuffer_add_c (t, *p);
        ++p;
    }
    t->alloc[t->wpos] = 0;
}

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

struct textbuffer *textbuffer_alloc (void) {
    struct textbuffer *t;
    t = (struct textbuffer *) calloc (sizeof(struct textbuffer),1);
    t->alloc = (char *) malloc ((size_t) 1024);
    t->size = 1024;
    return t;
}

