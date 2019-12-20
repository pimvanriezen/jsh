#
#  Example Makefile for building a program with embedded Duktape.
#  The example program here is the Duktape command line tool.
#

OBJS_DUKTAPE = \
	duktape/duktape.o duktape/duk_console.o \
	duktape/duk_module_duktape.o duktape/linenoise.o

OBJS_CLI = sysobject.o cli.o

CC = gcc
CCOPTS = -std=c99 -Wall
CCOPTS += -D_GNU_SOURCE -I./duktape   # duktape.h and duk_config.h must be in include path
CCLIBS = -lm

all: bin/jsh
    
bin:
	mkdir bin

clean:
	rm -f $(OBJS_DUKTAPE) $(OBJS_CLI) bin/jsh

bin/jsh: bin $(OBJS_DUKTAPE) $(OBJS_CLI)
	$(CC) $(CCOPTS) -o bin/jsh $(OBJS_DUKTAPE) $(OBJS_CLI) $(CCLIBS)

.SUFFIXES: .c.o
.c.o:
	$(CC) $(CCOPTS) -o $@ -c $<
