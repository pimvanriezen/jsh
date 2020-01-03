#
#  Example Makefile for building a program with embedded Duktape.
#  The example program here is the Duktape command line tool.
#

OBJS_DUKTAPE = \
	duktape/duktape.o duktape/duk_console.o \
	duktape/duk_module_duktape.o duktape/linenoise.o

OBJS_CLI = \
	src/cli.o src/sugar.o src/textbuffer.o src/channel.o src/sys_init.o \
	src/sys_channel.o src/sys_fs.o src/sys_run.o src/sys_misc.o \
	src/sys_module.o src/sys_io.o src/sys_sock.o src/fd.o \
	src/sys_global.o src/version.o

OBJS_HTTPD = \
	src/httpd.o src/sugar.o src/textbuffer.o src/channel.o src/sys_init.o \
	src/sys_channel.o src/sys_fs.o src/sys_run.o src/sys_misc.o \
	src/sys_module.o src/sys_io.o src/sys_sock.o src/fd.o \
	src/sys_global.o src/version.o

CC = gcc
CCOPTS += -std=c99 -Wall -I./include
CCOPTS += -D_GNU_SOURCE -I./duktape   # duktape.h and duk_config.h must be in include path
CCLIBS = -lm

all: version bin/jsh bin/jshttpd

version:
	@./mkversion

bin:
	mkdir bin

install: all
	@JSHRC=./jshrc JSH_GLOBAL=./js/modules/global.js \
	 JSH_APP_PATH=./js/app JSH_MODULE_PATH=./js/modules bin/jsh ./install.js

clean:
	rm -f $(OBJS_DUKTAPE) $(OBJS_CLI) $(OBJS_HTTPD) bin/jsh bin/jshttpd

bin/jsh: bin $(OBJS_DUKTAPE) $(OBJS_CLI)
	@rm src/version.o
	$(CC) $(CCOPTS) -o src/version.o -c src/version.c
	$(CC) $(CCOPTS) -o bin/jsh $(OBJS_DUKTAPE) $(OBJS_CLI) $(CCLIBS)

bin/jshttpd: bin $(OBJS_DUKTAPE) $(OBJS_HTTPD)
	@rm src/version.o
	$(CC) $(CCOPTS) -o src/version.o -c src/version.c
	$(CC) $(CCOPTS) -o bin/jshttpd $(OBJS_DUKTAPE) $(OBJS_HTTPD) $(CCLIBS) -lmicrohttpd

.SUFFIXES: .c.o
.c.o:
	$(CC) $(CCOPTS) -o $@ -c $<
