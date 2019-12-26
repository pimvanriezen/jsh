var save = function(data, filename) {
    if (typeof (data) == "object") {
        return sys.write (JSON.stringify(data,0,2), filename);
    }
    return sys.write (""+data, filename);
}

save.help = function() {
    setapi.helptext({
        name:"save",
        args:[
            {name:"data",text:<<<
                Data to save. If an object is passed, it will be encoded
                as JSON, otherwise it will be cast to a string value
                then written.
            >>>},
            {name:"path",text:"Location of the file to save."}
        ],
        text:"Saves data to the filesystem."
    });
}

module.version = "1.0.0";
module.exports = save;
