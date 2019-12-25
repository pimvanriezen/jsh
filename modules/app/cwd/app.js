var cwd = function() { return sys.cwd(); }
cwd.help = function() {
    setapi.helptext ({
        name:"cwd",
        text:"Returns the current working directory"
    });
}

module.version = "1.0.0";
module.exports = cwd;
