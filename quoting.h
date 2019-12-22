#ifndef _QUOTING_H
#define _QUOTING_H 1

struct textbuffer {
    char *alloc;
    size_t size;
    size_t wpos;
};

void textbuffer_add_c (struct textbuffer *t, char c);
void textbuffer_add (struct textbuffer *t, char c);
void textbuffer_add_str (struct textbuffer *t, const char *dt);
void textbuffer_add_data (struct textbuffer *t, const char *dt, size_t sz);
struct textbuffer *textbuffer_alloc (void);

char *handle_quoting (const char *);

#endif
