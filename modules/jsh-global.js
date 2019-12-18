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

defaults = function(def) {
    for (var k in def) {
        env._defaults[k] = def[k];
    }
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

