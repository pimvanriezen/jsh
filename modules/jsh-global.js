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

printerr = function(e) {
    console.log ("% " + e);
}

print = function(x) {
    if (typeof (x) == "string") return sys.print (x);
    if (typeof (x) == "object") return sys.print (JSON.stringify (x));
    sys.print ("" + x);
}

echo = console.log;

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
    return sys.getenv (key);
}
$envproxy.set = function (target, key, value) {
    sys.setenv (key, ""+value);
}
env = new Proxy ({}, $envproxy);

setenv = function(def) {
    for (var k in def) {
        env[k] = def[k];
    }
}

defaults = function(def) {
    for (var k in def) {
        if (! env[k]) env[k] = def[k];
    }
}

defaults({JSH_MODULE_PATH:"./modules"});

// ============================================================================
// Load in modules and globals
// ============================================================================
$ = require("fquery");
setapi = require("setapi");
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

