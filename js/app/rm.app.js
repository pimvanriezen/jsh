var rm = setapi ([
    {setarg:"target"},
    {literal:"rm"},
    {flag:{"recursive":"-r"},helptext:"Remove recursively"},
    {flag:{"force":"-f"},helptext:"Overrule permissions"},
    {arg:"target",unglob:true,helptext:"Object/path to remove"},
    {helptext:"Deletes filesystem object(s)."}
]);

module.version = "1.0.1";
module.exports = rm;
