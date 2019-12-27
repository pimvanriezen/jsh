var load = function(name) {
    var nm = ""+name;
    if (sys.stat(nm)) {
        var str = sys.read(nm);
        var res = str;
        try {
            res = JSON.parse (str);
        }
        catch (e) {
        }
        return res;
    }
}

load.help = function() {
    setapi.helptext({
        name:"load",
        args:[
            {name:"path",text:"Location of the file to load."}
        ],
        text:"Loads data from the filesystem. Returns the loaded data as "+
             "a string or parsed JSON object."
    });
}

module.version = "1.0.0";
module.exports = load;
