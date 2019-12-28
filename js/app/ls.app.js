var ls = function (path) {
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
    for (var k in objs) { maxlen(""+objs[k].size.toSize()); }
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
                         " : "+ o.user.padEnd(ulen) + "/" +
                         o.group.padEnd(glen+1) +
                         (""+o.size.toSize()).padStart(szlen+1) + " " +
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

module.version = "1.0.1";
module.exports = ls;
