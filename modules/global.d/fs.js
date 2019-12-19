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
    echo ("Usage:     which (unix command)");
    echo ("");
    echo ("Resolves a unix command to its path on the filesystem through "+
          "chasing the");
    echo ("env.PATH variable. Returns the absolute path for the command, "+
          "if it can ");
    echo ("be resolved.");
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
    echo ("Usage:     dir (path)");
    echo ("");
    echo ("Arguments: path   Path of the directory, or a glob matchstring.");
    echo ("");
    echo ("Gets directory information. Returns An object with stat data,");
    echo ("indexed by file name.");
}

ls = function(path) {
    function maxlen(str) {
        if (! this.max) this.max = 0;
        if (str) {
            var len = (""+str).length;
            if (len>this.max) this.max = len;
        }
        return this.max;
    }
    
    if (maxlen.max) maxlen.max = 0;

    function dtformat (date) {
        if (date.getDate === undefined) return ("?? ??? ????");
        var months = ["Jan","Feb","Mar","Apr","May","Jun",
                      "Jul","Aug","Sep","Oct","Nov","Dec"];
        return date.getDate() + " " + months[date.getMonth()] + " " + 
               date.getFullYear();
    }
    
    var objs = dir (path);
    maxlen("1234");
    for (var k in objs) { maxlen(objs[k].user);}
    var ulen = maxlen();
    maxlen.max = 4;
    for (var k in objs) { maxlen(objs[k].group); }
    var glen = maxlen();
    maxlen.max = 2;
    for (var k in objs) { maxlen(""+objs[k].size); }
    
    for (var name in objs) {
        var o = objs[name];
        if (o) {
            outstr = o.modeString + " [" + dtformat(o.mtime).padStart(11)+"] "+
                     o.user.padEnd(ulen) + "/ " +
                     o.group.padEnd(glen+1) +
                     (""+o.size).padStart(maxlen()+1) + " " +
                     name;
            console.log (outstr);
        }
    }
}

ls.help = function() {
    echo ("Usage:     ls ([path])");
    echo ("");
    echo ("Arguments: path   Path of the directory, or a glob matchstring. If left");
    echo ("                  empty, use current working directory.");
    echo ("");
    echo ("Prints contents of a directory in human-readable form to the console.");
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
    echo ("Usage:     exists (path)");
    echo ("Arguments: path   Location of the file to check.");
    echo ("");
    echo ("Checks the location of a file. Returns true if the file exists.");
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
    echo ("Usage:     load (path)");
    echo ("Arguments: path   Location of the file to load.");
    echo ("");
    echo ("Loads data from the filesystem. Returns the loaded data as "+
          "a string or\nparsed object.");
}

save = function(value,name) {
    var nm = "" + name;
    if (typeof (value) == "object") {
        return sys.write (JSON.stringify (value,null,2), nm);
    }
    return sys.write (""+value, nm);
}

save.help = function() {
    echo ("Usage:     save (value,path)");
    echo ("Arguments: value  The value to save (string, or object)");
    echo ("           path   Location to write to.");
    echo ("");
    echo ("Saves (object) data to the filesystem.");
}

// ============================================================================
// Working directory tools
// ============================================================================
cd = sys.cd;
cd.help = function() {
    echo ("Usage:     cd (path)");
    echo ("");
    echo ("Change current working directory");
}

cwd = sys.cwd;
cwd.help = function() {
    echo ("Usage:     cwd()");
    echo ("");
    echo ("Returns current working directory");
}

setapi (which, "which");
setapi (dir, "dir");
setapi (ls, "ls");
setapi (exists, "exists");
setapi (load, "load");
setapi (save, "save");
setapi (cd, "cd");
setapi (cwd, "cwd");
