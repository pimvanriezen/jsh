var cp = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"cp"},
    {flag:{"preserve":"-p"},helptext:"Preserve permissions"},
    {arg:"from",helptext:"Source file"},
    {arg:"to",helptext:"Destination path"},
    {helptext:"Copies a file."}
]);

module.version = "1.0.0";
module.exports = cp;
