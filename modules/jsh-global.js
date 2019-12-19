include = function(name) {
    var scripts = sys.glob (name);
    for (var i in scripts) {
        var script = sys.read (scripts[i]);
        try {
            eval(script);
        }
        catch (e) {
            sys.print ("% Error importing '"+scripts[i]+"': "+e);
        }
    }
}

include.help = function() {
    echo ("Usage:     include (glob)");
    echo ("");
    echo ("Includes one or more javascript matching the glob in global scope.");
}

printerr = function(e) {
    console.log ("% " + e);
}

printerr.help = function() {
    echo ("Usage:     include (errorstr)");
    echo ("");
    echo ("Outputs error to console");
}

print = function(x) {
    if (typeof (x) == "string") return sys.print (x);
    if (typeof (x) == "object") return sys.print (JSON.stringify (x));
    sys.print ("" + x);
}

print.help = function() {
    echo ("Usage:     print (data)");
    echo ("");
    echo ("Prints out the data, raw without a newline");
}

echo = console.log;

echo.help = function() {
    echo ("Usage:     echo (data)");
    echo ("");
    echo ("Prints data to the console, adding a newline");
}

run = function() {
    var args = [];
    if (arguments.length == 1) {
        var arg = ""+arguments[0];
        if (arg.indexOf (' ') < 0) return sys.run (arg, []);
        args = arg.split(' ');
        var cmd = args.splice(0,1)[0];
        return sys.run (cmd, args);
    }
    var cmd = arguments[0];
    for (var i=1;i<arguments.length; ++i) args.push (arguments[i]);
    return sys.run (cmd, args);
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
    echo ("Usage:     setenv ({key:val,key:val})");
    echo ("");
    echo ("Set multiple environment variables");
}

defaults = function(def) {
    for (var k in def) {
        env._defaults[k] = def[k];
    }
}

defaults.help = function() {
    echo ("Usage:     defaults ({key:val,key:val})");
    echo ("");
    echo ("Set multiple defaults environment variables. If the key is accessed"+
          "\nthrough env.KEY, and KEY is not in the environment, the default"+
          " will be\nobtained.");
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
String.prototype.padStart = function(len) {
    var res = this.slice(0,len);
    while (res.length < len) res = " "+res;
    return res;
}

String.prototype.padEnd = function(len) {
    var res = this.slice(0,len);
    while (res.length < len) res = res+" ";
    return res;
}

String.prototype.save = function(path) {
    sys.write (""+this, ""+path);
}

