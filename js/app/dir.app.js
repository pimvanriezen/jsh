var dir = function(path) {
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
        text:<<<`
            Gets directory information. Returns An object with stat
            data, indexed by file name. See help(stat) for information
            about the return data.
        `>>>
    });
}

module.version = "1.0.0";
module.exports = dir;
