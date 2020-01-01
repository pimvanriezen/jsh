var tree = function(path,field,maxdepth) {
    if (maxdepth == undefined) maxdepth = 8;
    var res = {};
    var objects;
    if (! field) field = "size";
    
    if (path) objects = sys.dir(path);
    else objects = sys.dir();
    
    for (var i in objects) {
        var id = objects[i];
        var nam = (path?path+'/':'')+objects[i];
        if (id.startsWith(".")) continue;
        var st = stat(nam);
        if (st.isDir) {
            if (maxdepth>1) {
                var v = tree(nam,field,maxdepth-1);
                if (v != null) {
                    if (Object.keys(v).length) {
                        res[id] = tree(nam,field,maxdepth-1);
                    }
                }
            }
            else res[id] = null;
        }
        else {
            if (typeof (field) == "function") {
                var v = field(nam,st);
                if (v != null) res[id] = v;
            }
            else if (field == "path") res[id] = nam;
            else res[id] = st[field];
        }
    }            
    return res;
}

tree.help = function() {
    setapi.helptext ({
        name:"tree",
        args:[
            {name:"path",text:<<<`
                Path to start at, if left out, the current directory is
                assumed.
            `>>>},
            {name:"field",text:<<<`
                The field from the stat() data for a found file that should
                be assigned to each node in the tree. This argument can
                also be a function that gets called with the file path
                and stat data, which can return custom data for each file.
                If this argument is not provided, the "size" field is
                used.
            `>>>},
            {name:"maxdepth",text:<<<`
                Maximum tree depth, directories deeper than the depth
                will be set to null.
            `>>>}
        ],
        text:<<<`
            Returns an object containing a tree representation of the
            filesystem down from a given path, with each property
            having the file/directory name as the key, with sub-directories
            being themselves objects of the same markup.
        `>>>
    });
}

tree.find = function(path,wildcard) {
    if (! wildcard) {
        wildcard = path;
        path = ".";
    }
    
    return tree (path,function(p,st) {
        var fn = p.replace(/.*\//,'');
        var retxt = wildcard.replace('.','\\.');
        retxt = retxt.replace('*','.*');
        retxt = retxt.replace('?','.');
        var re = new RegExp ("^"+retxt+"$",'g');
        if (fn.match (re)) {
            return p;
        }
        return null;
    });
}

tree.find.help = function() {
    setapi.helptext ({
        name:"tree",
        args:[
            {name:"path",text:<<<`
                The starting path. If left out, the first argument is taken
                to be the wildcard, and the path starts at the current
                working directory.
            `>>>},
            {name:"wildcard",text:<<<`
                The wildcard to match files to. 
            `>>>}
        ],
        text:<<<`
            Generates a tree structure where all leaf nodes are files
            matching the provided wildcard, with their full path as the
            value.
        `>>>
    });
}  

module.version = "1.0.0";
module.exports = tree;
