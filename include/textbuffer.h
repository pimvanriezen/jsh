#ifndef _TEXTBUFFER_H
#define _TEXTBUFFER_H 1

// ----------------------------------------------------------------------------
// A structure for keeping a string buffer that can automatically expand
// as data is added.
// ----------------------------------------------------------------------------
struct textbuffer {
    char *alloc;
    size_t size;
    size_t wpos;
};

// ============================================================================
// PROTOTYPES
// ============================================================================
void textbuffer_add_c (struct textbuffer *t, char c);
void textbuffer_add (struct textbuffer *t, char c);
void textbuffer_add_str (struct textbuffer *t, const char *dt);
void textbuffer_add_data (struct textbuffer *t, const char *dt, size_t sz);
struct textbuffer *textbuffer_alloc (void);
struct textbuffer *textbuffer_load (const char *);
struct textbuffer *textbuffer_load_fd (int);
void textbuffer_free (struct textbuffer *t);

#endif
