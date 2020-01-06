#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include "linenoise.h"
#include <fcntl.h>
#include <unistd.h>
#include "preprocessor.h"
#include "hash.h"

// ----------------------------------------------------------------------------
// Structures for keeping track of preprocessor defines
// ----------------------------------------------------------------------------
typedef struct define define;
struct define {
    define          *next;
    char            *key;
    char            *value; // We don't currently use the value for anything.
    uint32_t         hash;
};

typedef struct defines defines;
struct defines {
    define          *first;
};

static defines DEFINES;

// ============================================================================
// FUNCTION preprocessor_init
// ============================================================================
void preprocessor_init (void) {
    DEFINES.first = NULL;
}

// ============================================================================
// FUNCTION define_create
// ============================================================================
define *define_create (const char *key, const char *value, uint32_t hash) {
    define *res = malloc (sizeof (define));
    res->next = NULL;
    res->key = strdup (key);
    res->value = strdup (value);
    res->hash = hash;
    return res;
}

// ============================================================================
// FUNCTION preprocessor_define
// ============================================================================
void preprocessor_define (const char *key, const char *value) {
    uint32_t hash = hash_token (key);
    define *crsr = DEFINES.first;
    if (! crsr) {
        DEFINES.first = define_create (key, value, hash);
        return;
    }
    while (crsr->next) {
        if (crsr->hash == hash) {
            if (strcasecmp (crsr->key, key) == 0) {
                free (crsr->value);
                crsr->value = strdup (value);
                return;
            }
        }
        crsr = crsr->next;
    }
    crsr->next = define_create (key, value, hash);
}

// ============================================================================
// FUNCTION preprocessor_isdefined
// ============================================================================
bool preprocessor_isdefined (const char *key) {
    uint32_t hash = hash_token (key);
    define *crsr = DEFINES.first;
    while (crsr) {
        if (crsr->hash == hash) {
            if (strcasecmp (crsr->key, key) == 0) return true;
        }
        crsr = crsr->next;
    }
    return false;
}

// ----------------------------------------------------------------------------
// Stupid macros
// ----------------------------------------------------------------------------
#define ciswhite(c) (c==' ' || c=='\t')
#define cisquote(c) (c=='"' || c=='\'')

// ============================================================================
// FUNCTION handle_template_command
// --------------------------------
// Handles specific @{...} template commands within a <<<`quote`>>>.
// Since the end result of a <<<`quote`>>> statement should be a valid
// string definition, some convoluted magic goes on here.
// ============================================================================
int handle_template_command (const char *cptr, struct textbuffer *t,
                             bool output) {
    const char *c = cptr;
    if (! strchr (c, '}')) return 0;
    
    // @{if stmt}foo@{endif}
    // Should lead to:
    // ""+((stmt)?"foo":"")+""
    if (strncmp (c, "@{if ", 5) == 0) {
        c+= 5;
        if (output) textbuffer_add_str (t, "\"+((");
        while (*c != '}') {
            if (output) textbuffer_add_c (t, *c);
            c++;
        }
        c++;
        if (output) textbuffer_add_str (t, ")?\"");
    }
    // @{if stmt}foo@{else}bar@{endif}
    // Should lead to:
    // ""+((stmt)?"foo":true?"bar":"")+""
    else if (strncmp (c, "@{else}", 7) == 0) {
        c+= 7;
        if (output) textbuffer_add_str (t, "\":true?\"");
    }
    // @{if stma}foo@{elseif stmb}bar@{endif}
    // should lead to:
    // ""+((stma)?"foo":(stmb)?"bar":"")+""
    else if (strncmp (c, "@{else if ", 10) == 0 ||
             strncmp (c, "@{elseif ", 9) == 0 ||
             strncmp (c, "@{elsif ", 8) == 0) {
        c = strchr (c, ' ');
        c++;
        if (output) textbuffer_add_str (t, "\":(");
        while (*c != '}') {
            if (output) textbuffer_add_c (t, *c);
        }
        c++;
        if (output) textbuffer_add_str (t, ")?\"");
    }
    else if (strncmp (c, "@{endif}", 8) == 0) {
        c+= 8;
        if (output) textbuffer_add_str (t, "\":\"\")+\"");
    }
    // @{for stmt}foo@{next}
    // Should lead to:
    // ""+(function(){var _r=''; for(stmt){_r+="foo";} return _r;})()+""
    else if (strncmp (c, "@{for ", 6) == 0) {
        if (output) textbuffer_add_str (t, "\"+(function(){"
                                           "var _r=''; for (");
        c+= 6;
        while (*c != '}') {
            if (output) textbuffer_add_c (t, *c);
            c++;
        }
        c++;
        textbuffer_add_str (t, "){_r+=\"");
    }
    else if (strncmp (c, "@{endfor}", 9) == 0 ||
             strncmp (c, "@{next}", 7) == 0) {
        textbuffer_add_str (t, "\";} return _r;})()+\"");
        while (*c != '}') ++c;
        ++c;
    }
    // Throws an error by making it
    // ""+(function(){throw new Error("...")})()+""
    else {
        textbuffer_add_str (t, "\"+(function(){"
                               "throw new Error(\"Unrecognized "
                               "template directive: ");
        while (*c != '}') {
            if (*c == '"') textbuffer_add_c (t, '\\');
            textbuffer_add_c (t, *c);
            c++;
        }
        c++;
        textbuffer_add_str (t, "}\")})()+\"");
    }
    return (c - cptr);
}

// ============================================================================
// FUNCTION readkey
// ----------------
// Used by handle_directive to read an argument
// ============================================================================
static char *readkey (const char *c) {
    char *res;
    const char *k = c;
    while (*k && (!ciswhite(*k)) && (*k != '\n')) k++;
    res = malloc ((size_t) (k-c +1));
    memcpy (res, c, k-c);
    res[k-c] = 0;
    return res;
}

// ============================================================================
// FUNCTION handle_directive
// -------------------------
// Handles preprocessor '#foo' directives. Gets called by the preprocessor
// when it runs into an unquoted '#'. If an exact match with one of the
// defined directives is not found, everything is passed unaltered. On a
// match, the rest of the line is eaten.
// ============================================================================
int handle_directive (const char *cp, struct textbuffer *t, bool *out) {
    const char *c = cp;
    char *key = NULL;
    
    if (strncmp (c, "#ifdef ", 7) == 0) {
        c+= 7;
        key = readkey (c);
        if (! preprocessor_isdefined (key)) *out = false;
        else *out = true;
        free (key);
        const char *nc = strchr (c, '\n');
        if (nc) c = nc;
        else (c += strlen(c));
    }
    else if (strncmp (c, "#ifndef ", 8) == 0) {
        c+= 8;
        key = readkey (c);
        if (preprocessor_isdefined (key)) *out = false;
        else *out = true;
        free (key);
        const char *nc = strchr (c, '\n');
        if (nc) c = nc;
        else (c += strlen(c));
    }
    else if (strncmp (c, "#endif", 6) == 0) {
        *out = true;
        const char *nc = strchr (c, '\n');
        if (nc) c = nc;
        else (c += strlen(c));
    }
    else {
        if (out) {
            textbuffer_add (t, *c);
            c++;
        }
    }
    return c - cp;
}

// ============================================================================
// FUNCITON preprocess
// -------------------
// Transforms input text with jsh syntactic sugar (indented quoting, and
// the Class::protoFunction operator), trying to keep line numbering
// equal to the original. Returns a newly allocated string that needs
// to be freed by the caller when they're done with it.
// ============================================================================
char *preprocess (const char *src) {
    const char *hexdigits = "0123456789abcdef";
    char currentquote = 0;
    const char *c = src;
    struct textbuffer *t;
    int quoteline = 0;
    int skippedspaces = 0;
    int spacestoskip = 0;
    int hadcontent = 0;
    const char *linestart;
    bool output = true;
    
    t = textbuffer_alloc();
    
    while ((*c)) {
        // --------------------------------------------------------------------
        // Are we currently in a <<<`quote block`>>>?
        // --------------------------------------------------------------------
        if (currentquote == '<') {
            // Check for end of quote block
            if (c[0] == '`' && c[1] == '>' && c[2] == '>' &&
                c[3] == '>') {
                if (output) {
                    textbuffer_add_c (t, '"');
                    textbuffer_add (t, ')');
                }
                currentquote = 0;
                c += 4;
            }
            // If we're skipping over whitespace, do so now
            else if (ciswhite (*c) && !skippedspaces) {
                // keep skipping until a trend is set
                if (spacestoskip) {
                    // if we went past the first line, we know
                    // where new lines start, so we can go on.
                    if ((c - linestart + 1) >= spacestoskip) {
                        skippedspaces = 1;
                        hadcontent = 0;
                    }
                }
                c++;
            }
            // Are we running into non-whitespace while still skipping?
            else if (! skippedspaces) {
                // If we're the first line after the line starting the
                // quote, take this as an indication of how much whitespace
                // we should skip on subsequent lines.
                if (quoteline == 1) {
                    spacestoskip = (c - linestart);
                }
                skippedspaces = 1;
            }
            else if (*c == '\n') {
                // if we start with only whitespace after <<<,
                // we skip the first line. Otherwise, we
                // incorporate the newline. We add '\n"+"',
                // to keep line numbering consistent with the
                // original source.
                if (output) {
                    if (quoteline || hadcontent) {
                        // Ok this is tricky. We want a truly empty
                        // line that had no content yet to count
                        // as empty. But if it only appears empty
                        // because we parsed a template directive into
                        // it, and there was no other content,
                        // we'd like to ignore the line.
                        if (! hadcontent) {
                            if ((c-linestart) <= spacestoskip) {
                                textbuffer_add_str (t, "\\n\"+\n\"");
                            }
                            else {
                                textbuffer_add_str (t, "\"+\n\"");
                            }
                        }
                        else textbuffer_add_str (t, "\\n\"+\n\"");
                    }
                    else {
                        textbuffer_add_str (t, "\"+\n\"");
                    }
                }
                else textbuffer_add_str (t, "\n");
                quoteline++;
                c++;
                linestart = c;
                skippedspaces = 0;
                hadcontent = 0;
            }
            else if (*c == '\r') {
                // Skip windows EOL noise
                c++;
            }
            else if (*c == '\\') {
                // Escape backslash
                if (output) textbuffer_add_str (t, "\\\\");
                c++;
            }
            else if (c[0] == '$' && c[1] == '{') {
                // Inline variable
                if (output) textbuffer_add_str (t, "\"+");
                c += 2;
                while ((*c) && (*c != '}')) {
                    if (output) textbuffer_add_c (t, *c);
                    c++;
                }
                if (output) textbuffer_add_str (t, "+\"");
                if (*c) c++;
                hadcontent=1;
            }
            else if (c[0] == '@' && c[1] == '{') {
                // Template command
                c += handle_template_command (c, t, output);
                
                // if the command was on its own line,
                // ignore following whitespace and newline
                // (in the latter case, only in terms of line
                // numbering).
                if (! hadcontent) {
                    // if anything other than newline follows
                    // whitespace, we roll back and accept that
                    // the whitespace was intentional.
                    const char *backoff = c;
                    while (ciswhite (*c)) c++;
                    if (*c == '\n') {
                        c++;
                        linestart = c;
                        skippedspaces = 0;
                        if (output) textbuffer_add_str (t, "\"+\n\"");
                        else textbuffer_add_str (t, "\n");
                    }
                    else c = backoff;
                }
            }
            else if (cisquote (*c)) {
                // Since we're constructing our inline quote
                // as double quoted, we ironically need to
                // escape quotes.
                if (output) {
                    textbuffer_add_c (t, '\\');
                    textbuffer_add (t, *c);
                }
                c++;
                hadcontent=1;
            }
            else if (*c < 32) {
                // Escape non-printable characters.
                if (output) {
                    textbuffer_add_c (t, '\\');
                    textbuffer_add_c (t, 'x');
                    textbuffer_add_c (t, hexdigits[(*c & 0xf0) >> 4]);
                    textbuffer_add (t, hexdigits[(*c & 0x0f)]);
                }
                hadcontent = 1;
                c++;
            }
            else if (ciswhite(*c)) {
                const char *crsr = c;
                while (ciswhite(*crsr)) crsr++;
                if (crsr[0]=='@' && crsr[1] == '{') {
                    // syntax-indenting, don't copy
                    c = crsr;
                }
                else {
                    if (output) textbuffer_add (t, *c);
                    c++;
                }
            }
            else {
                // None of the above, add the literal character.
                if (output) textbuffer_add (t, *c);
                c++;
                hadcontent=1;
            }
        }
        // --------------------------------------------------------------------
        // Inside a regular javascript quote?
        // --------------------------------------------------------------------
        else if (currentquote) {
            // End of quote.
            if (*c == currentquote) {
                if (currentquote != '<') {
                    if (output) textbuffer_add (t, *c);
                    c++;
                    currentquote = 0;
                }
            }
            // Backslash, add next character as literal, so we ignore
            // quote characters.
            else if (*c == '\\') {
                if (output) textbuffer_add (t, *c);
                c++;
                if (*c) {
                    if (output) textbuffer_add (t, *c);
                    c++;
                }
            }
            // Nope, just add the literal
            else {
                if (output) textbuffer_add (t, *c);
                c++;
            }
        }
        // --------------------------------------------------------------------
        // From here on down, we're deffo not inside any kind of quote
        // --------------------------------------------------------------------
        // Line comment? Paste literally until end of line.
        else if (c[0] == '/' && c[1] == '/') {
            while (*c && (*c != '\n')) {
                if (output) textbuffer_add_c (t, *c);
                c++;
            }
            if (*c) {
                // even when not outputting, emit end of lines
                textbuffer_add (t, *c);
                c++;
            }
        }
        // Start of a /*comment*/? Paste literally until end of comment.
        else if (c[0] == '/' && c[1] == '*') {
            while (*c && (c[0] != '*' && c[1] != '/')) {
                if (output) textbuffer_add_c (t, *c);
                c++;
            }
            if (*c) {
                if (output) {
                    textbuffer_add_c (t, c[0]);
                    textbuffer_add_c (t, c[1]);
                }
                c+=2;
            }
        }
        // Dtart of a <<<`blockquote`>>>?
        else if (c[0] == '<' && c[1] == '<' &&
                 c[2] == '<' && c[3] == '`') {
            c += 4;
            currentquote = '<';
            quoteline = 0;
            skippedspaces = 0;
            spacestoskip = 0;
            hadcontent = 0;
            linestart = c;
            if (output) {
                textbuffer_add_c (t, '(');
                textbuffer_add (t, '"');
            }
        }
        // Start of a regular javascript quote.
        else if (cisquote (*c)) {
            if (output) textbuffer_add (t, *c);
            currentquote = *c;
            c++;
        }
        // '::' literal? Replace with ".prototype."
        else if (c-src && (c[0] == ':') && (c[1] == ':')) {
            if (output) textbuffer_add_str (t, ".prototype.");
            c+=2;
        }
        // None of the above, add literal
        else if ((*c) == '#') {
            c += handle_directive (c, t, &output);
        }
        else {
            if (output) textbuffer_add (t, *c);
            c++;
        }
    }
    
    // fprintf (stderr, "---\n%s\n---\n", t->alloc);
    textbuffer_add_c (t, 0);
    char *res = t->alloc;
    free (t);
    return res;
}
