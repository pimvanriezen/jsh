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
            sys.print ("["+scriptid+"]: "+e+'\n');
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
            
            You can check up on loaded modules and includes by calling
            dump(sys.modules).
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

humanSize = function (sz) {
    var res = sz;
    var factor = "";
    var factors = ["K","M","G","T"];
    for (var i in factors) {
        if (res > 10000) {
            res = res/1024;
            factor = factors[i];
        }
        else break;
    }
    return "" + res.toFixed(0) + factor;
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
        v.add = function(str) {
            var res = [];
            for (var i=0; i<this.length; ++i) {
                res.push (this[i]);
            }
            res.push(str);
            $envproxy.set (target, key, res);
        }
        v.remove = function(str) {
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

sys.loadapps = function() {
    for (var i in env.JSH_MODULE_PATH) {
        var glob = env.JSH_MODULE_PATH[i] + "/app/*/app.js";
        $(glob).each (function (match) {
            var appname = match.substr(0,match.length - "/app.js".length);
            var appname = appname.replace (/.*\//, "");
            sys.appload (appname, match);
        });
    }
}

// ============================================================================
// Load in modules and globals
// ============================================================================
if (env.JSHRC) {
    sys.parse (env.JSHRC, "bootstrap", "__sysrc__");
}
else if (sys.stat ("/etc/jsh/jshrc")) {
    sys.parse ("/etc/jsh/jshrc", "bootstrap", "__sysrc__");
}
else if (sys.stat ("/usr/local/etc/jsh/jshrc")) {
    sys.parse ("/usr/local/etc/jsh/jshrc", "bootstrap", "__sysrc__");
}

if (sys.stat (env.HOME + "/.jshrc")) {
    sys.parse (env.HOME + "/.jshrc", "bootstrap", "__userrc__");
}

setapi (setenv, "setenv");
setapi (defaults, "defaults");
setapi (include, "include");
setapi (printerr, "printerr");
setapi (print, "print");
setapi (echo, "echo");
