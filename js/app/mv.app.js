var mv = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"mv"},
    {arg:"from",unglob:true,helptext:"Original name(s)/location"},
    {arg:"to",helptext:"New name/location"},
    {helptext:"Moves/renames a filesystem object."}
]);

module.version = "1.0.1";
module.exports = mv;
