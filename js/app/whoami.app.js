var whoami = function() {
    var uid = sys.getuid();
    var res = userdb[uid];
    if (! res) {
        throw new Error ("Could not resolve our userid");
    }
    var gid = res.gid;
    var groups = sys.getgroups();
    res.groups = [];
    for (var g in groups) {
        var grp = groupdb[groups[g]];
        if (grp) res.groups.push (grp.name);
        else res.groups.push (groups[g]);
    }
    return res;
}

whoami.help = function() {
    setapi.helptext({
        name:"whoami",
        text:<<<`
            Returns information about the current user.
        `>>>
    });
}

module.version = "1.0.0";
module.exports = whoami;

    