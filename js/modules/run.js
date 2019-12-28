// ============================================================================
// FUNCTION run
// ============================================================================
var run = function() {
    var args = [];
    var res;
    if (arguments.length == 1) {
        var arg = ""+arguments[0];
        if (arg.indexOf (' ') < 0) res = sys.run (arg, []);
        else {
            args = arg.split(' ');
            var cmd = args.splice(0,1)[0];
            res = sys.run (cmd, args);
        }
        if (typeof(res) == "string" && res.indexOf('\n') == res.length-1) {
            res = res.substr (0,res.length-1);
        }
        return res;
    }
    var cmd = arguments[0];
    for (var i=1;i<arguments.length; ++i) args.push (arguments[i]);
    res = sys.run (cmd, args);
    if (typeof(res) == "string" && res.indexOf('\n') == res.length-1) {
        res = res.substr (0,res.length-1);
    }
    return res;
}

run.help = function() {
    setapi.helptext({
        name:"run",
        args:[
            {name:"cmd",text:"Command to run"},
            {name:"args",text:"Argument list"}
        ],
        text:<<<
            Executes a program and returns its output. Arguments an either
            be provided as a straight array, or as the rest of the argument
            list, or inline in the "cmd" key, separated by spaces.
        >>>
    });
}

// ============================================================================
// FUNCTION run.console
// ============================================================================
run.console = function() {
    var args = [];
    var res;
    if (arguments.length == 1) {
        var arg = ""+arguments[0];
        if (arg.indexOf (' ') < 0) res = sys.runconsole (arg, []);
        else {
            args = arg.split(' ');
            var cmd = which (args.splice(0,1)[0]);
            if (cmd) res = sys.runconsole (cmd, args);
        }
        return res;
    }
    var cmd = arguments[0];
    for (var i=1;i<arguments.length; ++i) args.push (arguments[i]);
    res = sys.runconsole (cmd, args);
    return res;
}

run.console.help = function() {
    setapi.helptext({
        name:"run.console",
        args:[
            {name:"cmd",text:"Command to run"},
            {name:"args",text:"Argument list"}
        ],
        text:<<<
            Behaves like run(), but executes connected to the shell's
            console, instead of exchanging data with the javascript
            layer.
        >>>
    });
}

// ============================================================================
// FUNCTION run.js
// ============================================================================
run.js = function(file) {
    if (! exists (file)) return false;
    var argv = arguments;
    var src = load (file);
    if (src.startsWith ("#!")) {
        var nextl = src.indexOf('\n');
        if (nextl<0) return false;
        src = src.substr (nextl);
    }
    
    // Decorate the source
    src = "(function(argv,JSAPI){"+src+"})";
    
    // Set up a channel and a coroutine to run the script
    var c = new Channel();
    var runf = function(c,argv) {
        return sys.eval(src)(argv,true);
    }
    
    // Spawn the coroutine, and get back the return data
    go (c, runf, argv);
    var res = c.recv();
    
    // Close the channel and return the result
    c.close();
    return res;
}

run.js.help = function() {
    setapi.helptext({
        name:"run.js",
        args:[
            {name:"file",text:"Location of the script file"}
        ],
        text:<<<
            Loads and runs a javascript file, in its own sub-process so it
            cannot stink up the global heap, but its return value is
            what we get back, instead of its standard output. Any extra
            arguments passed to the function will be available through
            argv[] inside the script.
        >>>
    });
}

module.exports = run;
