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
    echo ("Usage: which (unix command)");
    echo ("");
    echo ("Resolves a unix command to its path on the filesystem through "+
          "chasing the env.PATH variable.");
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

dir.help = function() { echo ("Usage: dir ([path or glob])"); }

ls = function(path) {
    function maxlen(str) {
        if (! this.max) this.max = 0;
        if (str) {
            var len = (""+str).length;
            if (len>this.max) this.max = len;
        }
        return this.max;
    }

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
    console.log ("ulen",ulen);
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

ls.help = function() { echo ("Usage: ls ([path or glob])"); }

stat = function(path) {
    return sys.stat (""+path);
}

stat.help = function() { echo ("Usage: stat (path)"); }

exists = function(path) {
    return ($(path).count() != 0);
}

exists.help = function() { echo ("Usage: exists (path)"); }

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

load.help = function() { echo ("Usage: load (path)"); }

save = function(value,name) {
    var nm = "" + name;
    if (typeof (value) == "object") {
        return sys.write (JSON.stringify (value,null,2), nm);
    }
    return sys.write (""+value, nm);
}

save.help = function() { echo ("Usage: save (value,path)"); }

// ============================================================================
// Working directory tools
// ============================================================================
cd = sys.cd;
cwd = sys.cwd;

