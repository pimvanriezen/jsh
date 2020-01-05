#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <sys/resource.h>
#include "linenoise.h"
#include <stdint.h>  /* Assume C99/C++11 with linenoise. */
#include <fcntl.h>
#include <unistd.h>
#include "sugar.h"

#define ciswhite(c) (c==' ' || c=='\t')
#define cisquote(c) (c=='"' || c=='\'')

// ============================================================================
// FUNCTION handle_template_command
// --------------------------------
// Handles specific @{...} template commands within a <<<`quote`>>>.
// Since the end result of a <<<`quote`>>> statement should be a valid
// string definition, some convoluted magic goes on here.
// ============================================================================
int handle_template_command (const char *cptr, struct textbuffer *t) {
    const char *c = cptr;
    if (! strchr (c, '}')) return 0;
    
    // @{if stmt}foo@{endif}
    // Should lead to:
    // ""+((stmt)?"foo":"")+""
    if (strncmp (c, "@{if ", 5) == 0) {
        c+= 5;
        textbuffer_add_str (t, "\"+((");
        while (*c != '}') {
            textbuffer_add_c (t, *c);
            c++;
        }
        c++;
        textbuffer_add_str (t, ")?\"");
    }
    // @{if stmt}foo@{else}bar@{endif}
    // Should lead to:
    // ""+((stmt)?"foo":true?"bar":"")+""
    else if (strncmp (c, "@{else}", 7) == 0) {
        c+= 7;
        textbuffer_add_str (t, "\":true?\"");
    }
    // @{if stma}foo@{elseif stmb}bar@{endif}
    // should lead to:
    // ""+((stma)?"foo":(stmb)?"bar":"")+""
    else if (strncmp (c, "@{else if ", 10) == 0 ||
             strncmp (c, "@{elseif ", 9) == 0 ||
             strncmp (c, "@{elsif ", 8) == 0) {
        c = strchr (c, ' ');
        c++;
        textbuffer_add_str (t, "\":(");
        while (*c != '}') {
            textbuffer_add_c (t, *c);
        }
        c++;
        textbuffer_add_str (t, ")?\"");
    }
    else if (strncmp (c, "@{endif}", 8) == 0) {
        c+= 8;
        textbuffer_add_str (t, "\":\"\")+\"");
    }
    // @{for stmt}foo@{next}
    // Should lead to:
    // ""+(function(){var _r=''; for(stmt){_r+="foo";} return _r;})()+""
    else if (strncmp (c, "@{for ", 6) == 0) {
        textbuffer_add_str (t, "\"+(function(){"
                               "var _r=''; for (");
        c+= 6;
        while (*c != '}') {
            textbuffer_add_c (t, *c);
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
// FUNCITON handle_sugar
// ---------------------
// Transforms input text with jsh syntactic sugar (indented quoting, and
// the Class::protoFunction operator), trying to keep line numbering
// equal to the original. Returns a newly allocated string that needs
// to be freed by the caller when they're done with it.
// ============================================================================
char *handle_sugar (const char *src) {
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
        // --------------------------------------------------------------------
        // Are we currently in a <<<`quote block`>>>?
        // --------------------------------------------------------------------
        if (currentquote == '<') {
            // Check for end of quote block
            if (c[0] == '`' && c[1] == '>' && c[2] == '>' &&
                c[3] == '>') {
                textbuffer_add_c (t, '"');
                textbuffer_add (t, ')');
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
                textbuffer_add_str (t, "\\\\");
            }
            else if (c[0] == '$' && c[1] == '{') {
                // Inline variable
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
            else if (c[0] == '@' && c[1] == '{') {
                // Template command
                c += handle_template_command (c, t);
                
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
                        textbuffer_add_str (t, "\"+\n\"");
                    }
                    else c = backoff;
                }
            }
            else if (cisquote (*c)) {
                // Since we're constructing our inline quote
                // as double quoted, we ironically need to
                // escape quotes.
                textbuffer_add_c (t, '\\');
                textbuffer_add (t, *c);
                c++;
                hadcontent=1;
            }
            else if (*c < 32) {
                // Escape non-printable characters.
                textbuffer_add_c (t, '\\');
                textbuffer_add_c (t, 'x');
                textbuffer_add_c (t, hexdigits[(*c & 0xf0) >> 4]);
                textbuffer_add (t, hexdigits[(*c & 0x0f)]);
            }
            else {
                // None of the above, add the literal character.
                textbuffer_add (t, *c);
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
                    textbuffer_add (t, *c++);
                    currentquote = 0;
                }
            }
            // Backslash, add next character as literal, so we ignore
            // quote characters.
            else if (*c == '\\') {
                textbuffer_add (t, *c);
                c++;
                if (*c) {
                    textbuffer_add (t, *c);
                    c++;
                }
            }
            // Nope, just add the literal
            else {
                textbuffer_add (t, *c);
                c++;
            }
        }
        // --------------------------------------------------------------------
        // From here on down, we're deffo not inside any kind of quote
        // --------------------------------------------------------------------
        // Line comment? Paste literally until end of line.
        else if (c[0] == '/' && c[1] == '/') {
            while (*c && (*c != '\n')) {
                textbuffer_add_c (t, *c);
                c++;
            }
            if (*c) {
                textbuffer_add (t, *c);
                c++;
            }
        }
        // Start of a /*comment*/? Paste literally until end of comment.
        else if (c[0] == '/' && c[1] == '*') {
            while (*c && (c[0] != '*' && c[1] != '/')) {
                textbuffer_add_c (t, *c);
                c++;
            }
            if (*c) {
                textbuffer_add_c (t, c[0]);
                textbuffer_add_c (t, c[1]);
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
            textbuffer_add_c (t, '(');
            textbuffer_add (t, '"');
        }
        // Start of a regular javascript quote.
        else if (cisquote (*c)) {
            textbuffer_add (t, *c);
            currentquote = *c;
            c++;
        }
        // '::' literal? Replace with ".prototype."
        else if (c-src && (c[0] == ':') && (c[1] == ':')) {
            textbuffer_add_str (t, ".prototype.");
            c+=2;
        }
        // None of the above, add literal
        else {
            textbuffer_add (t, *c);
            c++;
        }
    }
    
    // fprintf (stderr, "---\n%s\n---\n", t->alloc);
    
    char *res = t->alloc;
    free (t);
    return res;
}
