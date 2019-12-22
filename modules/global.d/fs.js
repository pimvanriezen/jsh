which = function(cmd) {
    var pathstr = sys.getenv ("PATH");
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
        text:"Resolves a unix command to its path on the filesystem "+
             "through chasing the env.PATH variable. Returns the absolute "+
             "path for the command, if it can be resolved."
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
    for (var k in objs) { maxlen(""+objs[k].size); }
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
                         (""+o.size).padStart(szlen+1) + " " +
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
cd = sys.cd;
cd.help = function() {
    setapi.helptext ({
        name:"cd",
        args:[
            {name:"path",text:"Relative or absolute path of new directory."}
        ],
        text:"Change current working directory"
    });
}

cwd = sys.cwd;
cwd.help = function() {
    setapi.helptext ({
        name:"cwd",
        text:"Returns the current working directory"
    });
}

setapi (which, "which");
setapi (dir, "dir");
setapi (ls, "ls");
setapi (exists, "exists");
setapi (load, "load");
setapi (save, "save");
setapi (cd, "cd");
setapi (cwd, "cwd");
