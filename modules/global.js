// ============================================================================
// Global include
// ============================================================================
include = function(name) {
    var scripts = sys.glob (name);
    if ((! name.startsWith('/')) && (! scripts.length)) {
        var paths = env.JSH_MODULE_PATH;
        for (var i in paths) {
            var path = paths[i];
            var nscripts = sys.glob (path + "/" + name);
            if (nscripts.length) {
                for (var ii in nscripts) {
                    scripts.push (nscripts[ii]);
                }
                break;
            }
        }
    }
    for (var i in scripts) {
        var script = scripts[i];
        var scriptid = script.replace (/.*\//,"");
        try {
            sys.parse (script, "include", scriptid);
        }
        catch (e) {
            sys.print ("% "+scripts+": "+e+'\n');
        }
    }
}

include.help = function() {
    setapi.helptext ({
        name:"include",
        args:[
            {name:"pathspec",text:"File or wildcard match"}
        ],
        opts:[],
        text:<<<
            Includes one or more javascript files, parsing them into the
            global scope. The system will look through all elements
            of env.JSH_MODULE_PATH, and will pick the first one that
            has matches on the glob.
        >>>
    });
}

// ============================================================================
// Printing
// ============================================================================
printerr = function(e) {
    console.log ("% " + e);
}

printerr.help = function() {
    setapi.helptext ({
        name:"printerr",
        args:[
            {name:"error",text:"The error text"}
        ],
        text:"Outputs error to the console"
    });
}

print = function(x) {
    if (typeof (x) == "string") return sys.print (x);
    if (typeof (x) == "object") return sys.print (JSON.stringify (x));
    sys.print ("" + x);
}

print.help = function() {
    setapi.helptext ({
        name:"print",
        args:[
            {name:"data",text:"String to print"}
        ],
        text:"Prints out the data, raw without a newline"
    });
}

echo = console.log;

echo.help = function() {
    setapi.helptext ({
        name:"echo",
        args:[
            {name:"data",text:"String to print"}
        ],
        text:"Prints data to the console, adding a newline"
    });
}

cat = function(fn) {
    if (exists (fn)) print (sys.read (fn));
    else return false;
}

cat.help = function() {
    setapi.helptext ({
        name:"cat",
        args:[
            {name:"filename",text:"File to output"}
        ],
        text:"Prints the raw contents of a file to the console."
    });
}

// ============================================================================
// Unix execution
// ============================================================================
run = function() {
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
// Environment
// ============================================================================
$envproxy = {};
$envproxy.has = function (target, key) {
    var v = sys.getenv (key);
    if (v === undefined) return false;
    return true;
}
$envproxy.get = function (target, key) {
    if (key == "_defaults") return target.defaults;
    var v = sys.getenv (key);
    if (v === undefined) v = target.defaults[key];
    if (key.indexOf("PATH") >= 0) {
        v = (""+v).split(':');
        v.addPathElement = function(str) {
            var res = [];
            for (var i=0; i<this.length; ++i) {
                res.push (this[i]);
            }
            res.push(str);
            $envproxy.set (target, key, res);
        }
        v.removePathElement = function(str) {
            var res = [];
            for (var i=0; i<this.length; ++i) {
                if (this[i] != str) res.push (this[i]);
            }
            $envproxy.set (target, key, res);
        }
    }
    return v;
}
$envproxy.set = function (target, key, value) {
    if (key == "_defaults") return;
    if (value.constructor == Array) {
        sys.setenv (key, value.join(':'));
    }
    else {
        sys.setenv (key, ""+value);
    }
}
env = new Proxy ({defaults:{}}, $envproxy);

setenv = function(def) {
    for (var k in def) {
        env[k] = def[k];
    }
}

setenv.help = function() {
    setapi.helptext ({
        name:"setenv",
        args:[
            {name:"data",text:"Object with a key/value dictionary "+
                              "of the environment variables to be set."}
        ],
        text:"Sets multiple environment variables"
    });
}

defaults = function(def) {
    for (var k in def) {
        if (def[k].length != undefined && typeof(def[k])!="string") {
            env._defaults[k] = def[k].join(':');
        }
        else env._defaults[k] = def[k];
    }
}

defaults.help = function() {
    setapi.helptext ({
        name:"defaults",
        args:[
            {name:"data",text:"Object with a key/value dictionary of "+
                              "the environment variables to be defaulted."}
        ],
        text:<<<
            Set multiple defaults environment variables. If the key is
            accessed through env.KEY, and KEY is not in the environment, the
            default will be obtained.
        >>>
    });
}

// ============================================================================
// User database
// ============================================================================
$userdbproxy = {}
$userdbproxy.get = function (target, key) {
    if ((key=="0")||(parseInt(key))) {
        return sys.getpwuid(parseInt(key));
    }
    return sys.getpwnam(key);
}
$userdbproxy.set = function () {
    throw ("Cannot change userdb");
}

userdb = new Proxy ({}, $userdbproxy);

// ============================================================================
// Process
// ============================================================================
$procproxy = {};
$procproxy.get = function(target,pid) {
    if (pid == "self") return sys.ps({pid:sys.getpid()})[sys.getpid()];
    return sys.ps({pid:pid})[pid];
}

proc = new Proxy ({}, $procproxy);

// ============================================================================
// Augmentations for the string class
// ============================================================================
String.prototype.padStart = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = c+res;
    return res;
}

String.prototype.padEnd = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = res+c;
    return res;
}

String.prototype.save = function(path) {
    sys.write (""+this, ""+path);
}

Object.defineProperty (Array.prototype, 'contains', {
    value: function(id) { return this.indexOf(id)>=0; }
});

Object.defineProperty (Object.prototype, 'save', {
    value: function(name) {
        return sys.write (JSON.stringify(this,null,2), name);
    }
});

// ============================================================================
// Load in modules and globals
// ============================================================================
defaults({
    JSH_MODULE_PATH:[
        env.HOME+"/.jsh/modules",
        "/usr/local/etc/jsh/modules",
        "/etc/jsh/modules"
    ],
    PATH:["/sbin","/usr/sbin","/bin","/usr/sbin"],
    EDITOR:"vi"
});

$ = require("fquery");
setapi = require("setapi");

setapi (setenv, "setenv");
setapi (defaults, "defaults");
setapi (run, "run");
setapi (run.console, "run.console");
setapi (include, "include");
setapi (printerr, "printerr");
setapi (print, "print");
setapi (echo, "echo");
setapi (cat, "cat");
setapi ($, "$");

include ("global.d/*.js");

if (exists (env.HOME + "/.jshrc")) {
    sys.parse (env.HOME + "/.jshrc", "bootstrap", "__userrc__");
}
