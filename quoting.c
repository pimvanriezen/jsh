#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include "linenoise.h"
#include <stdint.h>  /* Assume C99/C++11 with linenoise. */
#include "quoting.h"

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

#define ciswhite(c) (c==' ' || c=='\t')
#define cisquote(c) (c=='"' || c=='\'')

char *handle_quoting (const char *src) {
    const char *hexdigits = "0123456789abcdef";
    char currentquote = 0;
    const char *c = src;
    struct textbuffer *t;
    int quoteline = 0;
    int skippedspaces = 0;
    int spacestoskip = 0;
    int hadcontent = 0;
    const char *linestart;
    
    t = textbuffer_alloc();
    
    while ((*c)) {
        if (currentquote == '<') {
            if (c[0] == '>' && c[1] == '>' && c[2] == '>') {
                textbuffer_add (t, '"');
                currentquote = 0;
                c += 3;
            }
            else if (ciswhite (*c) && !skippedspaces) {
                // keep skipping until a trend is set
                if (spacestoskip) {
                    if ((c - linestart + 1) >= spacestoskip) {
                        skippedspaces = 1;
                    }
                }
                c++;
            }
            else if (! skippedspaces) {
                if (quoteline == 1) {
                    spacestoskip = (c - linestart);
                }
                skippedspaces = 1;
            }
            else if (*c == '\n') {
                if (quoteline || hadcontent) {
                    textbuffer_add_str (t, "\\n\"+\n\"");
                }
                quoteline++;
                c++;
                linestart = c;
                skippedspaces = 0;
            }
            else if (*c == '\r') {
                // Skip windows EOL noise
                c++;
            }
            else if (c[0] == '$' && c[1] == '{') {
                textbuffer_add_str (t, "\"+");
                c += 2;
                while ((*c) && (*c != '}')) {
                    textbuffer_add_c (t, *c);
                    c++;
                }
                textbuffer_add_str (t, "+\"");
                if (*c) c++;
                hadcontent=1;
            }
            else if (cisquote (*c)) {
                textbuffer_add_c (t, '\\');
                textbuffer_add (t, *c);
                c++;
                hadcontent=1;
            }
            else if (*c < 32) {
                /* Signed char, so high ascii is negative */
                textbuffer_add_c (t, '\\');
                textbuffer_add_c (t, 'x');
                textbuffer_add_c (t, hexdigits[(*c & 0xf0) >> 4]);
                textbuffer_add (t, hexdigits[(*c & 0x0f)]);
            }
            else {
                textbuffer_add (t, *c);
                c++;
                hadcontent=1;
            }
        }
        else if (currentquote && *c == currentquote) {
            if (currentquote != '<') {
                textbuffer_add (t, *c++);
                currentquote = 0;
            }
        }
        else if (!currentquote && c[0] == '<' && c[1] == '<' && c[2] == '<') {
            c += 3;
            currentquote = '<';
            quoteline = 0;
            skippedspaces = 0;
            spacestoskip = 0;
            hadcontent = 0;
            linestart = c;
            textbuffer_add (t, '"');
        }
        else if (currentquote && *c == '\\') {
            textbuffer_add (t, *c);
            c++;
            if (*c) {
                textbuffer_add (t, *c);
                c++;
            }
        }
        else if (cisquote (*c) && (! currentquote)) {
            textbuffer_add (t, *c);
            currentquote = *c;
            c++;
        }
        else {
            textbuffer_add (t, *c);
            c++;
        }
    }
    
    //fprintf (stderr, "---\n%s\n---\n", t->alloc);
    
    char *res = t->alloc;
    free (t);
    return res;
}
