// ============================================================================
// Global include
// ============================================================================
include = function(name) {
    var scripts = sys.glob (name);
    for (var i in scripts) {
        var script = sys.read (scripts[i]);
        try {
            sys.eval(script);
        }
        catch (e) {
            sys.print ("% "+scripts[i]+": "+e+'\n');
        }
    }
}

include.help = function() {
    setapi.helptext ({
        name:"include",
        args:[
            {name:"glob",text:"File or wildcard match"}
        ],
        opts:[],
        text:"Includes one or more javascript matching the glob in the "+
             "global scope."
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

run.help = function() {
    echo ("Usage:     run (cmd, <args>)");
    echo ("");
    echo ("Executes a program and returns its output. Arguments can be provided");
    echo ("in three ways:");
    echo ("");
    echo ("  1. run ('command','arg1','arg2')");
    echo ("  2. run ('command arg1 arg2')");
    echo ("  3. run ('command',[arg1,arg2])");
    echo ("");
    echo ("If execution fails, a boolean is returned with the value set to "+
          "false.");
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
    if (v === undefined) return target.defaults[key];
    return v;
}
$envproxy.set = function (target, key, value) {
    if (key == "_defaults") return;
    sys.setenv (key, ""+value);
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
        env._defaults[k] = def[k];
    }
}

defaults.help = function() {
    setapi.helptext ({
        name:"defaults",
        args:[
            {name:"data",text:"Object with a key/value dictionary of "+
                              "the environment variables to be defaulted."}
        ],
        text:"Set multiple defaults environment variables. If the key is "+
          "accessed through env.KEY, and KEY is not in the environment, the "+
          "default will be obtained."
    });
}

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
// Load in modules and globals
// ============================================================================
defaults({
    JSH_MODULE_PATH:"./modules",
    PATH:"/sbin:/usr/sbin:/bin:/usr/sbin"
});

$ = require("fquery");
setapi = require("setapi");

setapi (setenv, "setenv");
setapi (defaults, "defaults");
setapi (run, "run");
setapi (include, "include");
setapi (printerr, "printerr");
setapi (print, "print");
setapi (echo, "echo");

include (env.JSH_MODULE_PATH + "/global.d/*.js");

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

