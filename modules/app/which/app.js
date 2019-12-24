var which = function(cmd) {
    if (typeof (cmd) == "function") {
        if (cmd.unixcmd) {
            if (cmd.unixcmd()) {
                cmd = cmd.unixcmd();
            }
            else return cmd;
        }
        else return cmd;
    }
    var path = env.PATH;
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

module.exports = which;
