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

sys.cwd.help = function() {
    setapi.helptext ({
        name:"sys.cwd",
        text:"Returns the current working directory."
    });
}

setapi (sys.cwd, "sys.cwd");

sys.dir.help = function() {
    setapi.helptext ({
        name:"sys.dir",
        args:[
            {name:"path",text:<<<
                Path, leave empty for current working directory.
            >>>}
        ],
        text:<<<
            Returns a list of filesystem objects in the requested
            directory as an array of strings matching their
            filenames.
        >>>
    });
}

setapi (sys.dir, "sys.dir");

sys.eval.help = function() {
    setapi.helptext ({
        name:"sys.eval",
        args:[
            {name:"code",text:"The javascript code to evaluate"},
            {name:"filename",text:<<<
                [Optional] the filename the source code came from. Will
                be visible in backtraces, &c.
            >>>}
        ],
        text:<<<
            Evaluates a bit of javascript code kept in a string,
            returning whatever the code returns.
        >>>
    });
}

setapi (sys.eval, "sys.eval");

sys.parse.help = function() {
    setapi.helptext ({
        name:"sys.parse",
        args:[
            {name:"path",text:"The file to load javascript code from"},
            {name:"context",text:"[Optional] Name of the context"},
            {name:"module",text:"[Optional] Name of the module"}
        ],
        text:<<<
            Loads a javascript source file, compiles it into bytecode and
            runs it. The context and module arguments are used for the
            internal bookkeepping of the system.
        >>>
    });
}

setapi (sys.parse, "sys.parse");

sys.glob.help = function() {
    setapi.helptext ({
        name:"sys.glob",
        args:[
            {name:"match",text:"A filesystem wildcard expression"}
        ],
        text:<<<
            Matches a wildcard against files on the filesystem as seen
            from the current working directory. End users are
            encouraged to use the fquery frontend '$'. Returns
            an array of strings containing the matching paths.
        >>>
    });
}

setapi (sys.glob, "sys.glob");

sys.getenv.help = function() {
    setapi.helptext ({
        name:"sys.getenv",
        args:[
            {name:"key",text:"Name of the environment variable"}
        ],
        text:<<<
            Gets data from the system environment. End users are
            encouraged to use the env[] proxy.
        >>>
    });
}

setapi (sys.getenv, "sys.getenv");

sys.setenv.help = function() {
    setapi.helptext ({
        name:"sys.setenv",
        args:[
            {name:"key",text:"Name of the environment variable"},
            {name:"value",text:"Value to set (should be string)"}
        ],
        text:<<<
            Writes data to the system environment. End users are
            encouraged to use the env[] proxy.
        >>>
    });
}

setapi (sys.setenv, "sys.setenv");

sys.print.help = function() {
    setapi.helptext ({
        name:"sys.print",
        args:[
            {name:"text",text:"Data to print (must be string)"}
        ],
        text:<<<
            Outputs a string to the console, without a newline.
        >>>
    });
}

setapi (sys.print, "sys.print");

sys.read.help = function() {
    setapi.helptext ({
        name:"sys.read",
        args:[
            {name:"file",text:"Path of file to read"},
            {name:"maxsz",text:<<<
                [Optional] Maximum number of bytes to read from the file,
                return data will be truncated if it exceeds the size.
            >>>}
        ],
        text:<<<
            Reads data from the filesystem into a string. Note that this
            is not intended to deal with binary data, but rather
            with json/text/javascript files.
        >>>
    });
}

setapi (sys.read, "sys.read");

sys.write.help = function() {
    setapi.helptext ({
        name:"sys.write",
        args:[
            {name:"data",text:"The string data to write"},
            {name:"file",text:"The path to write the data to"}
        ],
        text:<<<
            Writes a string to the filesystem.
        >>>
    });
}

setapi (sys.write, "sys.write");

sys.run.help = function() {
    setapi.helptext ({
        name:"sys.run",
        args:[
            {name:"command",text:"The unix command to execute"},
            {name:"argv[]",text:"The arguments to pass"},
            {name:"stdin",text:"[Optional] data to feed its stdin."}
        ],
        text:<<<
            Executes a command, catching its output, if it had any,
            into a string that is returned. If the command
            returns with a non-zero exit status, false is returned.
            If the command wrote no output and has a zero exit-status,
            true is returned.
        >>>
    });
}

setapi (sys.run, "sys.run");

sys.runconsole.help = function() {
    setapi.helptext ({
        name:"sys.runconsole",
        args:[
            {name:"command",text:"The unix command to execute"},
            {name:"argv[]",text:"The arguments to pass"},
        ],
        text:<<<
            Executes a command, keeping its stdio hooked to the 
            foreground console. If the command
            returns with a non-zero exit status, false is returned.
            In other cases, true is returned.
        >>>
    });
}

setapi (sys.runconsole, "sys.runconsole");
