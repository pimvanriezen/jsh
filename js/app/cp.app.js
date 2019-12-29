var cp = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"cp"},
    {flag:{"preserve":"-p"},helptext:"Preserve permissions"},
    {arg:"from",unglob:true,helptext:"Source file(s)"},
    {arg:"to",helptext:"Destination path"},
    {helptext:"Copies a file."}
]);

module.version = "1.0.1";
module.exports = cp;
