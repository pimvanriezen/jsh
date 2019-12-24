var exists = function(path) {
    return ($(path).count() != 0);
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

module.exports = exists;
