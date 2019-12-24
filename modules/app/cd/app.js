var cd = function(arg) {
    if (! cd.history) cd.history = [];
    var newdir = arg;
    if (typeof (arg) == 'number') {
        if (arg < 0 && cd.history.length + arg >= 0) {
            newdir = cd.history[cd.history.length+arg];
        }
        else return false;
    }
    cd.history.push(cwd());
    return sys.cd (newdir);
}

cd.history = [];

cd.help = function() {
    setapi.helptext ({
        name:"cd",
        args:[
            {name:"path",text:"Relative or absolute path of the new "+
                              "directory, "+
                              "or a negative number indicating a relative "+
                              "position in the history."}
        ],
        text:<<<
            Pushes the current working directory into the history, and changes
            it to a new directory.
        >>>
    });
}

module.exports = cd;
