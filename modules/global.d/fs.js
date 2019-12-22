which = function(cmd) {
    if (typeof (cmd) == "function") {
        if (cmd.unixcmd) {
            if (cmd.unixcmd()) {
                cmd = cmd.unixcmd();
            }
            else return "{function}";
        }
        else return "{function}";
    }
    var pathstr = env.PATH;
    var path = pathstr.split(':');
    for (var k in path) {
        var st = sys.stat (path[k]+'/'+cmd);
        if (st && st.isExecutable) {
            return path[k]+'/'+cmd;
        }
    }
}

which.help = function() {
    setapi.helptext ({
        name:"which",
        args:[
            {name:"cmd",text:"The unix command"}
        ],
        text:<<<
            Resolves a unix command to its path on the filesystem
            through chasing the env.PATH variable. Returns the absolute
            path for the command, if it can be resolved.
            
            If the command provided is a function that happens to wrap
            an actual unix command, the path of that unix command
            will be resolved.
        >>>
    });
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
    
    objects.sort();
    
    for (var idx in objects) {
        var objpath = objects[idx];
        if (objpath[0] == '.') continue;
        if (path) objpath = path + "/" + objpath;
        dir[objects[idx]] = sys.stat (objpath);
    }
    return dir;
}

dir.help = function() {
    setapi.helptext({
        name:"dir",
        args:[
            {name:"path",text:"Path of the directory, or a glob matchstring"}
        ],
        text:"Gets directory information. Returns An object with stat "+
             "data, indexed by file name."
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

ls = function (path) {
    var ansi = {
        dir:"\033[34m",
        exe:"\033[97m",
        dev:"\033[31m",
        sock:"\033[33m",
        link:"\033[36m",
        file:"",
        end:"\033[0m"
    }
    var suffx = {
        dir:"/",
        exe:"",
        sock:"$",
        link:">",
        dev:""
    }
    if (env.TERM == "vt100") {
        ansi = {};
        suffx.exe = "*";
        suffx.dev = "@";
    }
    
    var maxlen = function (str) {
        if (! this.max) this.max = 0;
        var res = this.max;
        if (typeof (str) == "number") {
            this.max = str;
            res = str;
        }
        else if (str) {
            var len = (""+str).length;
            if (len>this.max) this.max = len;
            res = len;
        }
        else this.max = 0;
        return res;
    }
    
    maxlen();

    var dtformat = function (date) {
        if (date.getDate === undefined) return ("?? ??? ????");
        var months = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
        return date.getDate() + " " + months[date.getMonth()] + " " + 
               date.getFullYear();
    }
    
    var objs = dir (path);
    maxlen(4);
    for (var k in objs) { maxlen(objs[k].user);}
    var ulen = maxlen();
    maxlen(4);
    for (var k in objs) { maxlen(objs[k].group); }
    var glen = maxlen();
    maxlen(2);
    for (var k in objs) { maxlen(""+humanSize(objs[k].size)); }
    var szlen = maxlen();
    
    for (var name in objs) {
        var o = objs[name];
        if (o) {
            var fnstart="";
            var fnend="";
            var suffix="";
            
            if (o.isDir && ansi.dir) {
                fnstart = ansi.dir;
                fnend = ansi.end;
                suffix = suffx.dir;
            }
            if (o.isExecutable && ansi.exe) {
                fnstart = ansi.exe;
                fnend = ansi.end;
                suffix = suffx.exe;
            }
            if (o.isDevice && ansi.dev) {
                fnstart = ansi.dev;
                fnend = ansi.end;
                suffix = suffx.dev;
            }
            if (o.isSocket && ansi.sock) {
                fnstart = ansi.sock;
                fnend = ansi.end;
                suffix = suffx.sock;
            }
            if (o.isLink && ansi.link) {
                fnstart = ansi.link;
                fnend = ansi.end;
                suffix = suffx.link;
            }
            
            var outstr = o.modeString + " " + dtformat(o.mtime).padStart(11)+
                         " : "+ o.user.padEnd(ulen) + "/ " +
                         o.group.padEnd(glen+1) +
                         (""+humanSize(o.size)).padStart(szlen+1) + " " +
                         fnstart + name + fnend + suffix + '\n';
            sys.print (outstr);
        }
    }
}

ls.help = function() {
    setapi.helptext({
        name:"ls",
        args:[
            {name:"path",text:"Path of the directory, or a glob "+
                              "matchstring. If left empty, uses "+
                              "the current working directory."}
        ],
        text:"Prints contents of a directory in human-readable form to "+
             "the console."
    });
}

setapi (ls, "ls");

stat = function(path) {
    return sys.stat (""+path);
}

stat.help = function() { echo ("Usage: stat (path)"); }

exists = function(path) {
    return ($(path).count() != 0);
}

exists.help = function() {
    setapi.helptext({
        name:"exists",
        args:[
            {name:"path",text:"Location of the file to check."}
        ],
        text:"Checks the location of a file. Returns true if the file exists."
    });
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

load.help = function() {
    setapi.helptext({
        name:"load",
        args:[
            {name:"path",text:"Location of the file to load."}
        ],
        text:"Loads data from the filesystem. Returns the loaded data as "+
             "a string or parsed JSON object."
    });
}

save = function(value,name) {
    var nm = "" + name;
    if (typeof (value) == "object") {
        return sys.write (JSON.stringify (value,null,2), nm);
    }
    return sys.write (""+value, nm);
}

save.help = function() {
    setapi.helptext ({
        name:"save",
        args:[
            {name:"value",text:"String or object to save."},
            {name:"path",text:"File name and path to write to."}
        ],
        text:"Saves (object) data to the filesystem."
    });
}

// ============================================================================
// Working directory tools
// ============================================================================
cd = function(arg) {
    if (! cd.history) cd.history = [];
    var newdir = arg;
    if (typeof (arg) == 'number') {
        if (arg < 0 && cd.history.length + arg >= 0) {
            newdir = cd.history[cd.history.length+arg];
        }
        else return false;
    }
    cd.history.push(cwd());
    return sys.cd (newdir);
}

cd.history = [];

cd.help = function() {
    setapi.helptext ({
        name:"cd",
        args:[
            {name:"path",text:"Relative or absolute path of the new "+
                              "directory, "+
                              "or a negative number indicating a relative "+
                              "position in the history."}
        ],
        text:<<<
            Pushes the current working directory into the history, and changes
            it to a new directory.
        >>>
    });
}

cwd = sys.cwd;
cwd.help = function() {
    setapi.helptext ({
        name:"cwd",
        text:"Returns the current working directory"
    });
}

prompt = function(val) {
    if (val) {
        this.setval = val;
    }
    var fmt = "%p%# ";
    if (this.setval) fmt = this.setval;
    fmt = fmt.replace(/%p/,cwd());
    fmt = fmt.replace(/%h/,hostname());
    fmt = fmt.replace(/%i/,cd.history.length);
    fmt = fmt.replace(/%#/,">");
    return fmt;
}

prompt.help = function() {
    setapi.helptext ({
        name:"prompt",
        args:[
            {name:"str",text:"The prompt format string"}
        ],
        text:<<<
            Changes the look of the shell prompt. The format string recognizes
            a couple of substitutions:
        >>>
    });
    echo ("");
    var t = new texttable(3);
    t.addRow ("   ","%h","The hostname");
    t.addRow ("   ","%p","The current working directory");
    t.addRow ("   ","%i","The index in the directory history");
    t.addRow ("   ","%#","An apropriate prompt character (# for root)");
    t.boldcolumn = 1;
    echo (t.format());
    print (<<<
        You can also override the function completely to write a custom
        prompt, that gets executed every time the shell displays a new
        prompt.
    >>>.rewrap(sys.winsize()));
}

setapi (which, "which");
setapi (dir, "dir");
setapi (ls, "ls");
setapi (exists, "exists");
setapi (load, "load");
setapi (save, "save");
setapi (cd, "cd");
setapi (cwd, "cwd");
setapi (prompt, "prompt");
