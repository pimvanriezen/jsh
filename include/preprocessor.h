#ifndef _PREPROCESSOR_H
#define _PREPROCESSOR_H 1

#include <stdbool.h>
#include <stdint.h>
#include "textbuffer.h"

// ============================================================================
// PROTOTYPES
// ============================================================================
char *preprocess (const char *);
void  preprocessor_init (void);
void  preprocessor_define (const char *, const char *);
bool  preprocessor_isdefined (const char *);

#endif
