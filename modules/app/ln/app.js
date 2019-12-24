var ln = {
    help:function(){echo ("Usage: ln.soft | ln.hard");},
    soft:setapi([
        {name:"ln.soft"},
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {literal:"-s"},
        {arg:"to",helptext:"Filesystem object to link to"},
        {arg:"path",helptext:"Location of the link to be created"},
        {helptext:"Creates a softlink."}
    ]),
    hard:setapi([
        {name:"ln.hard"},
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {arg:"to",helptext:"Filesystem object to link to"},
        {arg:"path",helptext:"Location of the link to be created"},
        {helptext:"Creates a hardlink."}
    ])
};

module.version = "1.0.0";
module.exports = ln;
