var exists = function(path) {
    if (path.match (/[*?]/)) {
        return ($(path).count() != 0);
    }
    else if (stat (path)) return true;
    return false;
}

exists.help = function() {
    setapi.helptext({
        name:"exists",
        args:[
            {name:"path",text:"Location of the file to check."}
        ],
        text:"Checks the location of a file. Returns true if the file exists."
    });
}

module.version = "1.0.0";
module.exports = exists;
