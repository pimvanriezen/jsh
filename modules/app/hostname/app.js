var hostname = function(nm) {
    if (nm) return sys.hostname (nm);
    else return sys.hostname();
}

hostname.help = function() {
    setapi.helptext ({
        name:"hostname",
        args:[
            {name:"newname",text:"New hostname, leave empty to obtain the "+
                                 "currently configured name."}
        ],
        text:"Gets or sets the hostname."
    });
}

module.version = "1.0.0";
module.exports = hostname;
