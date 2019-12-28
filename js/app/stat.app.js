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
    echo (TextTable.auto(<<<
        mode         number  The unix filesystem mode
        modestring   string  The mode expressed as text, like ls() output.
        uid          number  Userid of the owner
        user         string  Username of the owner
        gid          number  Groupid of the group
        group        string  Groupname of the group
        size         number  The size in bytes
        atime        Date    The last access time
        mtime        Date    The last modification time
        ctime        Date    File creation time
        isDir        boolean Set to true, if the object is a directory
        isDevice     boolean Set to true, if the object is a device node
        isLink       boolean Set to true, if the object is a link
        isSocket     boolean Set to true, if the object is a socket
        isExecutable boolean Set to true, if the object is executable
    >>>,3).boldColumn(0).indent(4).format());
}

module.version = "1.0.1";
module.exports = stat;
