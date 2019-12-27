var cdhistory = [];

var cd = function(arg) {
    if (! cdhistory) cdhistory = [];
    var newdir = arg;
    if (typeof (arg) == 'number') {
        if (arg < 0 && cdhistory.length + arg >= 0) {
            newdir = cdhistory[cdhistory.length+arg];
        }
        else return false;
    }
    else if (arg === undefined) newdir = userdb[sys.getuid()].home;
    cdhistory.push(cwd());
    while (cdhistory.length > 32) cdhistory.slice (0,1);
    return sys.cd (newdir);
}

cd.help = function() {
    setapi.helptext ({
        name:"cd",
        args:[
            {name:"path",text: <<<
                Relative or absolute path of the new directory, or a
                negative number indicating a relative position in
                the history. If left empty, the path is assumed
                to be the home directory of the current user.
            >>>}
        ],
        text:<<<
            Pushes the current working directory into the history, and changes
            it to a new directory. Call cd.history() to get a view of the
            current history.
        >>>
    });
}

cd.history = function() {
    return cdhistory;
}

cd.history.help = function() {
    setapi.helptext ({
        name:"cd.history",
        text:<<<
            Displays the history of working directories.
        >>>
    });
}

module.version = "1.0.2";
module.exports = cd;
