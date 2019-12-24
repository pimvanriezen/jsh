var rm = setapi ([
    {setarg:"target"},
    {literal:"rm"},
    {flag:{"recursive":"-r"},helptext:"Remove recursively"},
    {flag:{"force":"-f"},helptext:"Overrule permissions"},
    {arg:"target",helptext:"Object/path to remove"},
    {helptext:"Deletes filesystem object(s)."}
]);

module.exports = rm;
