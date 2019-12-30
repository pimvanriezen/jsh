#
#  Example Makefile for building a program with embedded Duktape.
#  The example program here is the Duktape command line tool.
#

OBJS_DUKTAPE = \
	duktape/duktape.o duktape/duk_console.o \
	duktape/duk_module_duktape.o duktape/linenoise.o

OBJS_CLI = \
	src/cli.o src/quoting.o src/textbuffer.o src/channel.o src/sys_init.o \
	src/sys_channel.o src/sys_fs.o src/sys_run.o src/sys_misc.o \
	src/sys_module.o src/sys_io.o src/sys_sock.o

CC = gcc
CCOPTS += -std=c99 -Wall -I./include
CCOPTS += -D_GNU_SOURCE -I./duktape   # duktape.h and duk_config.h must be in include path
CCLIBS = -lm

all: bin/jsh
    
bin:
	mkdir bin

install: all
	@JSHRC=./jshrc JSH_GLOBAL=./js/modules/global.js \
	 JSH_APP_PATH=./js/app JSH_MODULE_PATH=./js/modules bin/jsh ./install.js

clean:
	rm -f $(OBJS_DUKTAPE) $(OBJS_CLI) bin/jsh

bin/jsh: bin $(OBJS_DUKTAPE) $(OBJS_CLI)
	$(CC) $(CCOPTS) -o bin/jsh $(OBJS_DUKTAPE) $(OBJS_CLI) $(CCLIBS)

.SUFFIXES: .c.o
.c.o:
	$(CC) $(CCOPTS) -o $@ -c $<
