var mv = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"mv"},
    {arg:"from",helptext:"Original name/location"},
    {arg:"to",helptext:"New name/location"},
    {helptext:"Moves/renames a filesystem object."}
]);

module.version = "1.0.0";
module.exports = mv;
