#ifdef IS_INTERACTIVE

// ============================================================================
// sys.cd
// ============================================================================
sys.cd.help = function() {
    setapi.helptext ({
        name:"sys.cd",
        args:[
            {name:"newdir",text:"New path"}
        ],
        text:"Changes the current working directory."
    });
}

setapi (sys.cd, "sys.cd");

// ============================================================================
// sys.cwd
// ============================================================================
sys.cwd.help = function() {
    setapi.helptext ({
        name:"sys.cwd",
        text:"Returns the current working directory."
    });
}

setapi (sys.cwd, "sys.cwd");

// ============================================================================
// sys.dir
// ============================================================================
sys.dir.help = function() {
    setapi.helptext ({
        name:"sys.dir",
        args:[
            {name:"path",text:<<<`
                Path, leave empty for current working directory.
            `>>>}
        ],
        text:<<<`
            Returns a list of filesystem objects in the requested
            directory as an array of strings matching their
            filenames.
        `>>>
    });
}

setapi (sys.dir, "sys.dir");

// ============================================================================
// sys.eval
// ============================================================================
sys.eval.help = function() {
    setapi.helptext ({
        name:"sys.eval",
        args:[
            {name:"code",text:"The javascript code to evaluate"},
            {name:"filename",text:<<<`
                [Optional] the filename the source code came from. Will
                be visible in backtraces, &c.
            `>>>}
        ],
        text:<<<`
            Evaluates a bit of javascript code kept in a string,
            returning whatever the code returns.
        `>>>
    });
}

setapi (sys.eval, "sys.eval");

// ============================================================================
// sys.parse
// ============================================================================
sys.parse.help = function() {
    setapi.helptext ({
        name:"sys.parse",
        args:[
            {name:"path",text:"The file to load javascript code from"},
            {name:"context",text:"[Optional] Name of the context"},
            {name:"module",text:"[Optional] Name of the module"}
        ],
        text:<<<`
            Loads a javascript source file, compiles it into bytecode and
            runs it. The context and module arguments are used for the
            internal bookkeepping of the system.
        `>>>
    });
}

setapi (sys.parse, "sys.parse");

// ============================================================================
// sys.glob
// ============================================================================
sys.glob.help = function() {
    setapi.helptext ({
        name:"sys.glob",
        args:[
            {name:"match",text:"A filesystem wildcard expression"}
        ],
        text:<<<`
            Matches a wildcard against files on the filesystem as seen
            from the current working directory. End users are
            encouraged to use the fquery frontend '$'. Returns
            an array of strings containing the matching paths.
        `>>>
    });
}

setapi (sys.glob, "sys.glob");

// ============================================================================
// sys.getenv
// ============================================================================
sys.getenv.help = function() {
    setapi.helptext ({
        name:"sys.getenv",
        args:[
            {name:"key",text:"Name of the environment variable"}
        ],
        text:<<<`
            Gets data from the system environment. End users are
            encouraged to use the env[] proxy.
        `>>>
    });
}

setapi (sys.getenv, "sys.getenv");

// ============================================================================
// sys.setenv
// ============================================================================
sys.setenv.help = function() {
    setapi.helptext ({
        name:"sys.setenv",
        args:[
            {name:"key",text:"Name of the environment variable"},
            {name:"value",text:"Value to set (should be string)"}
        ],
        text:<<<`
            Writes data to the system environment. End users are
            encouraged to use the env[] proxy.
        `>>>
    });
}

setapi (sys.setenv, "sys.setenv");

// ============================================================================
// sys.print
// ============================================================================
sys.print.help = function() {
    setapi.helptext ({
        name:"sys.print",
        args:[
            {name:"text",text:"Data to print (must be string)"}
        ],
        text:<<<`
            Outputs a string to the console, without a newline.
        `>>>
    });
}

setapi (sys.print, "sys.print");

// ============================================================================
// sys.uptime
// ============================================================================
sys.uptime.help = function() {
    setapi.helptext ({
        name:"sys.uptime",
        text:<<<`
            Returns the system uptime in seconds.
        `>>>
    });
}

setapi (sys.uptime, "sys.uptime");

// ============================================================================
// sys.uptime
// ============================================================================
sys.loadavg.help = function() {
    setapi.helptext ({
        name:"sys.loadavg",
        text:<<<`
            Returns the system load average as an array of three numbers.
        `>>>
    });
}

setapi (sys.loadavg, "sys.loadavg");

// ============================================================================
// sys.kill
// ============================================================================
sys.kill.help = function() {
    setapi.helptext ({
        name:"sys.kill",
        args:[
            {name:"pid",text:"The pid to signal"},
            {name:"signal",text:<<<`
                Either a number (0 to check if a process exists), or
                a signal string in libc terms, e.g., "SIGABRT", "SIGTERM",
                "SIGKILL".
            `>>>}
        ],
        text:<<<`
            Sends a signal to a process.
        `>>>
    });
}

setapi (sys.kill, "sys.kill");

// ============================================================================
// sys.read
// ============================================================================
sys.read.help = function() {
    setapi.helptext ({
        name:"sys.read",
        args:[
            {name:"file",text:"Path of file to read"},
            {name:"maxsz",text:<<<`
                [Optional] Maximum number of bytes to read from the file,
                return data will be truncated if it exceeds the size.
            `>>>}
        ],
        text:<<<`
            Reads data from the filesystem into a string. Note that this
            is not intended to deal with binary data, but rather
            with json/text/javascript files.
        `>>>
    });
}

setapi (sys.read, "sys.read");

// ============================================================================
// sys.write
// ============================================================================
sys.write.help = function() {
    setapi.helptext ({
        name:"sys.write",
        args:[
            {name:"data",text:"The string data to write"},
            {name:"file",text:"The path to write the data to"}
        ],
        text:<<<`
            Writes a string to the filesystem.
        `>>>
    });
}

setapi (sys.write, "sys.write");

// ============================================================================
// sys.run
// ============================================================================
sys.run.help = function() {
    setapi.helptext ({
        name:"sys.run",
        args:[
            {name:"command",text:"The unix command to execute"},
            {name:"argv[]",text:"The arguments to pass"},
            {name:"stdin",text:"[Optional] data to feed its stdin."}
        ],
        text:<<<`
            Executes a command, catching its output, if it had any,
            into a string that is returned. If the command
            returns with a non-zero exit status, false is returned.
            If the command wrote no output and has a zero exit-status,
            true is returned.
        `>>>
    });
}

setapi (sys.run, "sys.run");

// ============================================================================
// sys.runconsole
// ============================================================================
sys.runconsole.help = function() {
    setapi.helptext ({
        name:"sys.runconsole",
        args:[
            {name:"command",text:"The unix command to execute"},
            {name:"argv[]",text:"The arguments to pass"},
        ],
        text:<<<`
            Executes a command, keeping its stdio hooked to the 
            foreground console. If the command
            returns with a non-zero exit status, false is returned.
            In other cases, true is returned.
        `>>>
    });
}

setapi (sys.runconsole, "sys.runconsole");

// ============================================================================
// sys.mkdir
// ============================================================================
sys.mkdir.help = function() {
    setapi.helptext ({
        name:"sys.mkdir",
        args:[
            {name:"path",text:"Name and path of the directory"},
            {name:"mode",text:"[Optional] The mode (number)"}
        ],
        text:<<<`
            Creates a new directort.
        `>>>
    });
}

setapi (sys.mkdir, "sys.mkdir");

// ============================================================================
// sys.chmod
// ============================================================================
sys.chmod.help = function() {
    setapi.helptext ({
        name:"sys.chmod",
        args:[
            {name:"path",text:"The filesystem object to change"},
            {name:"mode",text:"The new mode (number)"}
        ],
        text:<<<`
            Change permissions of a filesystem object.
        `>>>
    })
}

setapi (sys.chmod, "sys.chmod");

// ============================================================================
// sys.chown
// ============================================================================
sys.chown.help = function() {
    setapi.helptext ({
        name:"sys.chown",
        args:[
            {name:"path",text:"The filesystem object to change"},
            {name:"uid",text:"The new userid (number)"},
            {name:"gid",text:"The new groupid (number)"}
        ],
        text:<<<`
            Change ownership of a filesystem object.
        `>>>
    });
}

setapi (sys.chown, "sys.chown");

// ============================================================================
// sys.getpwnam
// ============================================================================
sys.getpwnam.help = function() {
    setapi.helptext ({
        name:"sys.getpwnam",
        args:[
            {name:"username",text:"Requested username"}
        ],
        text:<<<`
            Gets information about a unix account.
        `>>>
    });
}

setapi (sys.getpwnam, "sys.getpwnam");

// ============================================================================
// sys.getpwuid
// ============================================================================
sys.getpwuid.help = function() {
    setapi.helptext ({
        name:"sys.getpwuid",
        args:[
            {name:"uid",text:"Requested userid (number)"}
        ],
        text:<<<`
            Gets information about a unix account.
        `>>>
    });
}

setapi (sys.getpwuid, "sys.getpwuid");

// ============================================================================
// sys.getgrnam
// ============================================================================
sys.getgrnam.help = function() {
    setapi.helptext ({
        name:"sys.getgrnam",
        args:[
            {name:"groupname",text:"Requested groupname"}
        ],
        text:<<<`
            Gets information about a unix group.
        `>>>
    });
}

setapi (sys.getgrnam, "sys.getgrnam");

// ============================================================================
// sys.getgrgid
// ============================================================================
sys.getgrgid.help = function() {
    setapi.helptext ({
        name:"sys.getgrgid",
        args:[
            {name:"gid",text:"Requested groupid (number)"}
        ],
        text:<<<`
            Gets information about a unix group.
        `>>>
    });
}

setapi (sys.getgrgid, "sys.getgrgid");

// ============================================================================
// sys.getgroups
// ============================================================================
sys.getgroups.help = function() {
    setapi.helptext ({
        name:"sys.getgroups",
        text:<<<`
            Returns an array of groupids the current user is a member of.
        `>>>
    });
}

setapi (sys.getgroups, "sys.getgroups");

// ============================================================================
// sys.hostname
// ============================================================================
sys.hostname.help = function() {
    setapi.helptext ({
        name:"sys.hostname",
        args:[
            {name:"newname",text:"[Optional] new hostname"}
        ],
        text:<<<`
            Gets or sets the system hostname.
        `>>>
    });
}

setapi (sys.hostname, "sys.hostname");

// ============================================================================
// sys.winsize
// ============================================================================
sys.winsize.help = function() {
    setapi.helptext ({
        name:"sys.winsize",
        text:<<<`
            Returns the projected width of the console.
        `>>>
    });
}

setapi (sys.winsize, "sys.winsize");

// ============================================================================
// sys.stat
// ============================================================================
sys.stat.help = function() {
    setapi.helptext ({
        name:"sys.stat",
        args:[
            {name:"path",text:"Filesystem object to inspect"}
        ],
        text:<<<`
            Returns information about a filesystem object.
        `>>>
    });
}

setapi (sys.stat, "sys.stat");

// ============================================================================
// sys.getuid
// ============================================================================
sys.getuid.help = function() {
    setapi.helptext ({
        name:"sys.getuid",
        text:<<<`
            Returns the current active userid.
        `>>>
    });
}

setapi (sys.getuid, "sys.getuid");

// ============================================================================
// sys.getgid
// ============================================================================
sys.getgid.help = function() {
    setapi.helptext ({
        name:"sys.getgid",
        text:<<<`
            Returns the current active groupid.
        `>>>
    });
}

setapi (sys.getgid, "sys.getgid");

// ============================================================================
// sys.getpid
// ============================================================================
sys.getpid.help = function() {
    setapi.helptext ({
        name:"sys.getpid",
        text:<<<`
            Returns the current process id.
        `>>>
    });
}

setapi (sys.getuid, "sys.getpid");

// ============================================================================
// sys.uname
// ============================================================================
sys.uname.help = function() {
    setapi.helptext ({
        name:"sys.uname",
        text:<<<`
            Returns information about the underlying operating system
            kernel.
        `>>>
    });
}

setapi (sys.uname, "sys.uname");

// ============================================================================
// sys.channel.open
// ============================================================================
sys.channel.open.help = function() {
    setapi.helptext ({
        name:"sys.channel.open",
        text:<<<`
            Opens a new channel object. Returns a number representing
            the channel id.
        `>>>
    })
}

setapi (sys.channel.open, "sys.channel.open");

// ============================================================================
// sys.channel.send
// ============================================================================
sys.channel.send.help = function() {
    setapi.helptext ({
        name:"sys.channel.send",
        args:[
            {name:"id",text:"The channel id"},
            {name:"data",text:"The data to send (string)"}
        ],
        text:<<<`
            Sends string data to a channel. Returns false if no data
            could be sent (because there's nobody listening).
        `>>>
    });
}

setapi (sys.channel.send, "sys.channel.send");

// ============================================================================
// sys.channel.recv
// ============================================================================
sys.channel.recv.help = function() {
    setapi.helptext ({
        name:"sys.channel.recv",
        args:[
            {name:"id",text:"The channel id"}
        ],
        text:<<<`
            Receives string data from a channel. Returns the boolean value
            of false if no data could be read (because there are no
            senders). Otherwise the string data is returned.
        `>>>
    });
}

setapi (sys.channel.recv, "sys.channel.recv");

// ============================================================================
// sys.channel.exit
// ============================================================================
sys.channel.exit.help = function() {
    setapi.helptext ({
        name:"sys.channel.exit",
        args:[
            {name:"id",text:"The channel id"}
        ],
        text:<<<`
            Tells all listeners that we're quitting the circus, then
            closes all pipes associated with a channel. Any remaining
            queued messages are discarded.
        `>>>
    });
}

setapi (sys.channel.exit, "sys.channel.exit");

// ============================================================================
// sys.channel.close
// ============================================================================
sys.channel.close.help = function() {
    setapi.helptext ({
        name:"sys.channel.close",
        args:[
            {name:"id",text:"The channel id"}
        ],
        text:<<<`
            Completely shuts down a channel. If there are any child
            processes spawned on its behalf, they are unceremoniously
            killed.
        `>>>
    });
}

setapi (sys.channel.close, "sys.channel.close");

// ============================================================================
// sys.channel.senderror
// ============================================================================
sys.channel.senderror.help = function() {
    setapi.helptext ({
        name:"sys.channel.senderror",
        args:[
            {name:"id",text:"The channel id"},
            {name:"errstr",text:"The error string"}
        ],
        text:<<<`
            From the perspective of a co-routine, this sets the
            channel on the other end into an error state that
            can be picked up through sys.channel.error().
        `>>>
    });
}

setapi (sys.channel.senderror, "sys.channel.senderror");

// ============================================================================
// sys.channel.error
// ============================================================================
sys.channel.error.help = function() {
    setapi.helptext ({
        name:"sys.channel.error",
        args:[
            {name:"id",text:"The channel id"},
        ],
        text:<<<`
            If any coroutines pushed an error through, the error
            string will be returned. If there were no errors on
            the channel, false is returned.
        `>>>
    });
}

setapi (sys.channel.error, "sys.channel.error");

// ============================================================================
// sys.channel.stat
// ============================================================================
sys.channel.stat.help = function() {
    setapi.helptext ({
        name:"sys.channel.stat",
        text:<<<`
            Returns information about the currently open channels.
        `>>>
    });
}

setapi (sys.channel.stat, "sys.channel.stat");

// ============================================================================
// sys.go
// ============================================================================
sys.go.help = function() {
    setapi.helptext ({
        name:"sys.go",
        args:[
            {name:"id",text:"The channel id associated with the coroutine"},
            {name:"func",text:"The function to call in the child process"}
        ],
        text:<<<`
            Spawns a co-routine. All open filedescriptors will be closed
            for the child process, except for those needed to communicate
            with the associated channel.
        `>>>
    });
}

setapi (sys.go, "sys.go");

// ============================================================================
// sys.io.open
// ============================================================================
sys.io.open.help = function() {
    setapi.helptext ({
        name:"sys.io.open",
        args:[
            {name:"file",text:"Filename to open"},
            {name:"mode",text:<<<`
                Access mode. A string with one or more single character
                flags for read(r), write(r), truncate(t), and append(a).
            `>>>}
        ],
        text:<<<`
            Opens a fileystem file. Returns a file descriptor.
        `>>>
    });
}

setapi (sys.io.open, "sys.io.open");

// ============================================================================
// sys.io.close
// ============================================================================
sys.io.close.help = function() {
    setapi.helptext ({
        name:"sys.io.close",
        args:[
            {name:"fd",text:"Filedescriptor to close"},
        ],
        text:<<<`
            Closes a filedescriptor.
        `>>>
    });
}

setapi (sys.io.close, "sys.io.close");

// ============================================================================
// sys.io.read
// ============================================================================
sys.io.read.help = function() {
    setapi.helptext ({
        name:"sys.io.read",
        args:[
            {name:"fd",text:"Filedescriptor to read from"},
            {name:"size",text:<<<`
                Number of bytes to read. Returned buffer will be smaller
                if end-of-file is reached.
            `>>>}
        ],
        text:<<<`
            Reads data from an open file descriptor. Returns a raw
            Uint8Array with the read bytes.
        `>>>
    });
}

setapi (sys.io.read, "sys.io.read");

// ============================================================================
// sys.io.read
// ============================================================================
sys.io.write.help = function() {
    setapi.helptext ({
        name:"sys.io.write",
        args:[
            {name:"fd",text:"Filedescriptor to write to"},
            {name:"data",text:<<<`
                An Uint8Array with the bytes that should be written.
            `>>>}
        ],
        text:<<<`
            Writes data to an open file descriptor. Returns false if the
            data could not be successfully written.
        `>>>
    });
}

setapi (sys.io.write, "sys.io.write");

// ============================================================================
// sys.sock.unix
// ============================================================================
sys.sock.unix.help = function() {
    setapi.helptext ({
        name:"sys.sock.unix",
        args:[
            {name:"path",text:"Socket to connect to"},
        ],
        text:<<<`
            Creates and connects a unix domain socket. Returns the file
            descriptor for the socket, or false if the connection failed.
        `>>>
    });
}

setapi (sys.sock.unix, "sys.sock.unix");

// ============================================================================
// sys.sock.tcp
// ============================================================================
sys.sock.tcp.help = function() {
    setapi.helptext ({
        name:"sys.sock.tcp",
        args:[
            {name:"addr",text:"IPv4 or IPv6 address to connect to"},
            {name:"port",text:"TCP port to connect to"},
            {name:"binadaddr",text:"[Optional] local address to bind to"}
        ],
        text:<<<`
            Creates and connects a TCP socket. Returns the file
            descriptor for the socket, or false if the connection failed.
        `>>>
    });
}

setapi (sys.sock.tcp, "sys.sock.tcp");

// ============================================================================
// sys.sock.unixlisten
// ============================================================================
sys.sock.unixlisten.help = function() {
    setapi.helptext ({
        name:"sys.sock.unixlisten",
        args:[
            {name:"path",text:"Path of socket to set up"},
        ],
        text:<<<`
            Creates a listening a unix domain socket. Returns the file
            descriptor for the socket, or false if the socket could
            not be created (like if the file for the socket already
            exists).
        `>>>
    });
}

setapi (sys.sock.unixlisten, "sys.sock.unixlisten");

// ============================================================================
// sys.sock.tcplisten
// ============================================================================
sys.sock.tcplisten.help = function() {
    setapi.helptext ({
        name:"sys.sock.tcplisten",
        args:[
            {name:"addr",text:"[Optional] IPv4 or IPv6 address to bind to"},
            {name:"port",text:"TCP port to bind to"},
        ],
        text:<<<`
            Creates a listening a TCP socket. Returns the file
            descriptor for the socket, or false if the socket could
            not be created.
        `>>>
    });
}

setapi (sys.sock.tcplisten, "sys.sock.tcplisten");

// ============================================================================
// sys.sock.accept
// ============================================================================
sys.sock.accept.help = function() {
    setapi.helptext ({
        name:"sys.sock.accept",
        args:[
            {name:"fd",text:"Filedescriptor of a listening socket"}
        ],
        text:<<<`
            Waits for an incoming connection on the listening socket,
            then returns the file descriptor of a socket associated
            with this new connection.
            
            Returns false on failure.
        `>>>
    });
}

setapi (sys.sock.accept, "sys.sock.accept");

// ============================================================================
// sys.sock.udp
// ============================================================================
sys.sock.udp.help = function() {
    setapi.helptext ({
        name:"sys.sock.udp",
        text:<<<`
            Creates a new socket for UDP communication. Returns the file
            descriptor.
        `>>>
    });
}

setapi (sys.sock.udp, "sys.sock.udp");

// ============================================================================
// sys.sock.udpbind
// ============================================================================
sys.sock.udpbind.help = function() {
    setapi.helptext ({
        name:"sys.sock.udpbind",
        args:[
            {name:"spec",text:<<<`
                Either one or two arguments. If it is one, it specifies
                the port number. In case of two arguments, we expect
                the address followed by the port number.
            `>>>}
        ],
        text:<<<`
            Binds a UDP socket to a specific port (and optionally address),
            so it can receive messages as well as send.
        `>>>
    });
}

setapi (sys.sock.udpbind, "sys.sock.udpbind");

// ============================================================================
// sys.sock.send
// ============================================================================
sys.sock.send.help = function() {
    setapi.helptext ({
        name:"sys.sock.send",
        args:[
            {name:"sock",text:"A UDP socket filedescriptor"},
            {name:"addr",text:"IPv4/IPv6 address to send to"},
            {name:"port",text:"UDP port to send to"},
            {name:"data",text:"A Uint8Array buffer with the data"}
        ],
        text:<<<`
            Sends data to a remote UDP receiver.
        `>>>
    });
}

setapi (sys.sock.send, "sys.sock.send");

// ============================================================================
// sys.sock.recv
// ============================================================================
sys.sock.recv.help = function() {
    setapi.helptext ({
        name:"sys.sock.recv",
        args:[
            {name:"sock",text:"A UDP socket filedescriptor"}
        ],
        text:<<<`
            Receives an incoming packet from the UDP socket. Returns
            an object with a Uint8Array in the .data property, and
            the address of the sender in the .from property.
        `>>>
    });
}

setapi (sys.sock.recv, "sys.sock.recv");

// ============================================================================
// sys.sock.stat
// ============================================================================
sys.sock.stat.help = function() {
    setapi.helptext ({
        name:"sys.sock.stat",
        text:<<<`
            Returns information about the currently open channels.
        `>>>
    });
}

setapi (sys.sock.stat, "sys.sock.stat");

// ============================================================================
// sys.gethostbyname
// ============================================================================
sys.gethostbyname.help = function() {
    setapi.helptext ({
        name:"sys.gethostbyname",
        args:[
            {name:"hostname",text:"The hostname to resolve"}
        ],
        text:<<<`
            Uses the system resolver to look up the IPv4/IPv6 address
            that a given hostname is mapped to. Returns an array
            with one or more IPv4/IPv6 addresses. If the host could not
            be resolved, an empty array is returned.
        `>>>
    })
}

setapi (sys.gethostbyname, "sys.gethostbyname");

// ============================================================================
// sys.global.get
// ============================================================================
sys.global.get.help = function() {
    setapi.helptext ({
        name:"sys.global.get",
        args:[
            {name:"rootid",text:<<<`
                The top level root key for the storage object.
            `>>>},
            {name:"id",text:<<<`
                The key of the storage object.
            `>>>},
            {name:"locked",text:<<<`
                If provided, and true, other threads will be blocked
                from accessing the object until this thread has
                relinquished it by writing a value to it.
            `>>>}
        ],
        text:<<<`
            The global storage is a tool for multiple threads within
            a jshttpd application to share data between eachother.
            Rather than messing through this API, user code is encouraged
            to use the globalstorage.js module provided.
        `>>>
    })
}

setapi (sys.global.get, "sys.global.get");

// ============================================================================
// sys.global.set
// ============================================================================
sys.global.set.help = function() {
    setapi.helptext ({
        name:"sys.global.set",
        args:[
            {name:"rootid",text:<<<`
                The top level root key for the storage object.
            `>>>},
            {name:"id",text:<<<`
                The key of the storage object.
            `>>>},
            {name:"value",text:<<<`
                The value to store. Only accepts strings. Needs
                prior serialization if you want to store objects.
            `>>>}
        ],
        text:<<<`
           Writes a value to the global storage, and unlocks it if it was
           locked.
        `>>>
    })
}

setapi (sys.global.set, "sys.global.set");

// ============================================================================
// sys.sql.open
// ============================================================================
sys.sql.open.help = function() {
    setapi.helptext ({
        name:"sys.sql.open",
        args:[
            {name:"path",text:"Database path"}
        ],
        text:<<<`
            Opens a connection to an SQLite database. Returns a database
            handle needed for other sys.sql.* calls.
        `>>>
    })
}

setapi (sys.sql.open, "sys.sql.open");

// ============================================================================
// sys.sql.close
// ============================================================================
sys.sql.close.help = function() {
    setapi.helptext ({
        name:"sys.sql.close",
        args:[
            {name:"handle",text:"Database handle"}
        ],
        text:<<<`
            Closes a database connection.
        `>>>
    });
}

setapi (sys.sql.close, "sys.sql.close");

// ============================================================================
// sys.sql.query
// ============================================================================
sys.sql.query.help = function() {
    setapi.helptext ({
        name:"sys.sql.query",
        args:[
            {name:"handle",text:"Database handle"},
            {name:"query",text:<<<`
                The query text. Argument can be followed by parameters
                for a prepared statement. Acceptable value types for
                extra parameters are number, string, and null.
            `>>>}
        ],
        text:<<<`
            Performs an SQL query.
        `>>>
    });
}

setapi (sys.sql.query, "sys.sql.query");

// ============================================================================
// sys.sql.rowsaffected
// ============================================================================
sys.sql.rowsaffected.help = function() {
    setapi.helptext ({
        name:"sys.sql.rowsaffected",
        args:[
            {name:"handle",text:"Database handle"}
        ],
        text:<<<`
            Returns the number of rows affected by the last query.
        `>>>
    });
}

setapi (sys.sql.rowsaffected, "sys.sql.rowsaffected");
// ============================================================================
// jshttpd request
// ============================================================================
if (! globalThis.request) {
    request = function() {};

    request.help = function() {
        print (setapi.textformat(<<<`
            The request object is passed around when running in jshttpd
            context. Specifically, a jshttpd application will have somewhere
            in its global scope a call to request.setHandler(), which will
            point to either a function, or an object with a function called
            resolve(), which will be called with the request object as
            an argument, and return a HTTP status code.
        
            The following fields and functions are available on the object:
        `>>>));
    
        print (TextTable.auto (<<<`
            req.peer                A string containg the IP address of the
                                    host doing the HTTP request
            req.url                 The requested path
            req.postbody            Any data posted
            req.method              The request method
            req.getHeader(name)     Returns the value of a header sent by the
                                    client. The name is canonized to be
                                    case-insensitive
            req.setHeader(name)     Sets the value of a header to be sent back
                                    to the client. Name is again case-sensitive
                                    and will be canonized
            req.send(data)          Adds data to the output buffer
            req.clear()             Clears the output buffer
            req.sendFile(path)      Will send out a file straight, the output
                                    buffer will be ignored.
        `>>>, 2).indent(4).boldColumn(0).format());
    }
    setapi (request, "request");
}

sys.dancingbears = function() {
  echo (<<<`
  .
     _--_     _--_    _--_     _--_     _--_     _--_     _--_     _--_
    ( () )___( () )  ( () )___( () )   ( () )___( () )   ( () )___( () )
     \           /    \           /     \           /     \           /
      (  ' _ `  )      (  ' _ `  )       (  ' _ `  )       (  ' _ `  )
       \  ___  /        \  ___  /         \  ___  /         \  ___  /
     .__( `-' )          ( `-' )           ( `-' )        .__( `-' )  ___
    / !  `---' \      _--'`---_          .--`---'\       /   /`---'`-'   \
   /  \         !    /         \___     /        _>\    /   /          ._/   __
  !   /\        !   /   /       !  \   /  /-___-'   ) /'   /.-----\___/     /  )
  !   !_\______/\. (   <        !__/ /'  (        _/  \___//          `----'   !
   \    \       ! \ \   \      /\    \___/`------' )       \            ______/
    \___/   )  /__/  \--/   \ /  \  ._    \      `<         `--_____----'
      \    /   !       `.    )-   \/  ) ___>-_     \   /-\    \    /
      /   !   /         !   !  `.    / /      `-_   `-/  /    !   !
     !   /__ /___       /  /__   \__/ (  \---__/ `-_    /     /  /__
     (______)____)     (______)        \__)         `-_/     (______)`
  `>>>);
}

#endif
