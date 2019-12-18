// ============================================================================
// Filesystem query implementation
// ============================================================================
function fquery(q) {
    this.query = q;
}

fquery.prototype.write = function(data) {
    var matches = sys.glob (this.query);
    for (var k in matches) {
        sys.write (data, matches[k]);
    }
}

fquery.prototype.run = function() {
    var matches = sys.glob (this.query);
    var res = true;
    for (var k in matches) {
        sys.run (matches[k], arguments);
    } 
}

fquery.prototype.count = function() {
    var matches = sys.glob (this.query);
    return matches.length;
}

fquery.prototype.each = function(f) {
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        f (matches[i]);
    }
}

fquery.prototype.cat = function() {
    var res = "";
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        var data = sys.read (matches[i]);
        if (data) res += data;
    }
    return res;
}

$ = function(match) {
    return new fquery(match);
}

// ============================================================================
// Various printing functions
// ============================================================================
printerr = function(e) {
    console.log ("% " + e);
}

print = function(x) {
    if (typeof (x) == "string") return sys.print (x);
    if (typeof (x) == "object") return sys.print (JSON.stringify (x));
    sys.print ("" + x);
}

echo = console.log;

dump = function(x) {
    if (typeof (x) == "object") console.log (JSON.stringify(x,null,2));
    else console.log (x);
}

// ============================================================================
// API for interacting with unix tools
// ============================================================================
setapi = function(defarr) {
    return function() {
        var argp = 0;
        var args = {};
        var lastp = arguments.length;
        if (lastp) {
            var last = arguments[lastp-1];
            if (typeof (last) == "object") {
                args = last;
                lastp--;
            }
        }
        var argv = [];
        for (var ai in defarr) {
            var def = defarr[ai];
            if (def.setarg) {
                if (argp < lastp) {
                    args[def.setarg] = arguments[argp++];
                }
            }
            if (def.literal) {
                argv.push (def.literal);
                continue;
            }
            if (def.opt) {
                for (var k in args) {
                    if (def.opt[k]) {
                        var val = def.opt[k];
                        if (typeof (val) == "string") {
                            val = [val];
                        }
                        for (var i in val) {
                            argv.push (val[i]);
                        }
                        argv.push (args[k]);
                    }
                }
                continue;
            }
            if (def.arg) {
                if (args[def.arg] == undefined) {
                    printerr ("Missing argument: "+def.arg);
                    return null;
                }
                argv.push (""+args[def.arg]);
                continue;
            }
            if (def.flag) {
                for (var ak in args) {
                    if (def.flag[ak]) {
                        if (args[ak]) argv.push (def.flag[ak]);
                    }
                }
            }
        }
        
        var pathstr = sys.getenv ("PATH");
        var path = pathstr.split(':');
        var cmd = argv.splice (0,1);
        if (cmd) cmd = cmd[0];
        for (var k in path) {
            if (sys.stat (path[k]+'/'+cmd)) {
                cmd = path[k]+'/'+cmd;
                break;
            }
        }
        return console.log (cmd, argv);
    }
}

// ============================================================================
// Directory handling wrappers
// ============================================================================
dir = function(path) {
    var dir = {};
    var objects = [];
    
    if (! path) objects = sys.dir();
    else {
        if ((path.indexOf('*')>=0)||(path.indexOf('?')>=0)) {
            objects = sys.glob (path);
            path = null;
        }
        else {
            objects = sys.dir (path);
        }
    }
    for (var idx in objects) {
        var objpath = objects[idx];
        if (path) objpath = path + "/" + objpath;
        dir[objects[idx]] = sys.stat (objpath);
    }
    return dir;
}

ls = function(path) {
    var objs = dir (path);
    for (var name in objs) {
        var o = objs[name];
        if (o) {
            outstr = o.modeString + " " +
                     o.user.padEnd(9) +
                     o.group.padEnd(9) +
                     (""+o.size).padStart(9) + " " +
                     name;
            console.log (outstr);
        }
    }
}

load = function(name) {
    var nm = ""+name;
    if (sys.stat(nm)) {
        var str = sys.read(nm);
        var res = str;
        try {
            res = JSON.parse (str);
        }
        catch (e) {
        }
        return res;
    }
}

save = function(value,name) {
    var nm = "" + name;
    if (typeof (value) == "object") {
        return sys.write (JSON.stringify (value,null,2), nm);
    }
    return sys.write (""+value, nm);
}

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

// ============================================================================
// Working directory tools
// ============================================================================
cd = sys.cd;
cwd = sys.cwd;

// ============================================================================
// Environment
// ============================================================================
_environmentProxy = {};
_environmentProxy.has = function (target, key) {
    var v = sys.getenv (key);
    if (v === undefined) return false;
    return true;
}
_environmentProxy.get = function (target, key) {
    return sys.getenv (key);
}
_environmentProxy.set = function (target, key, value) {
    sys.setenv (key, ""+value);
}
env = new Proxy ({}, _environmentProxy);
setenv = function(def) {
    for (var k in def) {
        env[k] = def[k];
    }
}

// ============================================================================
// Unix command wrappers
// ============================================================================
iptables = {
    add:setapi ([
        {literal:"iptables"},
        {opt:{"table":"-t"}},
        {literal:"-a"},
        {arg:"chain"},
        {opt:{"proto":"-p"}},
        {opt:{"input":"-i"}},
        {opt:{"src":"--source"}},
        {opt:{"srcport":"--sport"}},
        {opt:{"output":"-o"}},
        {opt:{"dst":"--destination"}},
        {opt:{"dstport":"--dport"}},
        {opt:{"state":["-m","state","--state"]}},
        {opt:{"target":"-j"}}
    ]),
    remove:setapi ([
        {literal:"iptables"},
        {opt:{"table":"-t"}},
        {literal:"-d"},
        {arg:"chain"},
        {opt:{"proto":"-p"}},
        {opt:{"input":"-i"}},
        {opt:{"src":"--source"}},
        {opt:{"srcport":"--sport"}},
        {opt:{"output":"-o"}},
        {opt:{"dst":"--destination"}},
        {opt:{"dstport":"--dport"}},
        {opt:{"state":["-m","state","--state"]}},
        {opt:{"target":"-j"}}
    ]),
    create:setapi ([
        {literal:"iptables"},
        {opt:{"table":"-t"}},
        {literal:"-C"},
        {arg:"chain"}
    ])
};

cp = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"cp"},
    {arg:"from"},
    {arg:"to"}
]);

mv = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"mv"},
    {arg:"from"},
    {arg:"to"}
]);

ln = {
    soft:setapi([
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {literal:"-s"},
        {arg:"to"},
        {arg:"path"}
    ]),
    hard:setapi([
        {setarg:"path"},
        {setarg:"to"},
        {literal:"ln"},
        {arg:"to"},
        {arg:"path"}
    ])
};

signal = {
    TERM:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-TERM"},{arg:"pid"}
    ]),
    KILL:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-KILL"},{arg:"pid"}
    ]),
    STOP:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    HUP:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    RESUME:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    USR1:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-USR1"},{arg:"pid"}
    ])
};

rm = setapi ([
    {setarg:"target"},
    {literal:"rm"},
    {flag:{"recursive":"-r","force":"-f"}},
    {arg:"target"}
]);
