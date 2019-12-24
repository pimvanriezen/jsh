var stat = function(path) {
    return sys.stat (""+path);
}

stat.help = function() {
    setapi.helptext ({
        name:"stat",
        args:[
            {name:"path",text:"Path of filesystem object to inspect"}
        ],
        text:<<<
            Inspects a filesystem object and returns some of its
            characteristics in an object with the following fields:
        >>>
    });
    echo ("");
    var t = new texttable(3);
    t.addRow ("mode","number","The unix filesystem mode");
    t.addRow ("modestring","string","The mode expressed as text");
    t.addRow ("uid","number","The owner's userid");
    t.addRow ("user","string","The owner's username");
    t.addRow ("gid","number","The group's groupid");
    t.addRow ("group","string","The group's groupname");
    t.addRow ("size","number","The size in bytes");
    t.addRow ("atime","Date","The last access time");
    t.addRow ("mtime","Date","The last modification time");
    t.addRow ("ctime","Date","The time of the file's creation");
    t.addRow ("isDir","boolean","Set to true if object is a directory");
    t.addRow ("isDevice","boolean","Set to true if object is a device node");
    t.addRow ("isLink","boolean","Set to true if the file is a link");
    t.addRow ("isSocket","boolean","Set to true if the file is a socket");
    t.addRow ("isExecutable","boolean","Set to true if the file is "+
                                          "executable");
    
    t.boldColumn (0);
    t.indent (4);
    print (t.format());
    echo ("");
}

module.exports = stat;
