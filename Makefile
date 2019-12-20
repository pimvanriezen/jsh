#
#  Example Makefile for building a program with embedded Duktape.
#  The example program here is the Duktape command line tool.
#

DUKTAPE_SOURCES = duktape/duktape.c

CMDLINE_SOURCES = \
	duktape/duk_cmdline.c duk_sys.c

CC = gcc
CCOPTS = -std=c99 -Wall
CCOPTS += -D_C99_SOURCE -I./duktape   # duktape.h and duk_config.h must be in include path
CCLIBS = -lm

# Enable console object (console.log() etc) for command line.
CMDLINE_SOURCES += duktape/duk_console.c

# Enable Duktape 1.x module loading for command line.
CMDLINE_SOURCES += duktape/duk_module_duktape.c

# If you want linenoise, you can enable these.  At the moment linenoise
# will cause some harmless compilation warnings.
CMDLINE_SOURCES += duktape/linenoise.c

# Use the tools/configure.py utility to modify Duktape default configuration:
# http://duktape.org/guide.html#compiling
# http://wiki.duktape.org/Configuring.html

jsh: $(DUKTAPE_SOURCES) $(CMDLINE_SOURCES)
	$(CC) -o $@ $(DEFINES) $(CCOPTS) $(DUKTAPE_SOURCES) $(CMDLINE_SOURCES) $(CCLIBS)

