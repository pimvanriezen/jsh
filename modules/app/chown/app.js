var chown = setapi ([
    {name:"chown"},
    {setarg:"path"},
    {setarg:"owner"},
    {arg:"path",helptext:"Object to change"},
    {arg:"owner",helptext:"New owner (username or userid)"},
    {f:function(args) {
        if (! exists (args.path)) return false;
        if (! userdb[args.owner]) return false;
        var uid = userdb[args.owner].uid;
        var gid = stat(args.path).gid;
        sys.chown (path, uid, gid);
    }},
    {helptext:"Change owner of filesystem object."}
]);

module.exports = chown;
