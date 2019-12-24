// ============================================================================
// Unix execution
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

module.exports = run;
