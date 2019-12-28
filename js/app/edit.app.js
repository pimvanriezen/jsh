var edit = setapi ([
    {name:"edit"},
    {setarg:"file"},
    {literal:function(){ return env.EDITOR; }},
    {arg:"file",helptext:"The file to edit"},
    {console:true},
    {helptext:"Opens a file in the default editor, as specified in "+
              "the env.EDITOR environment-variable."}
]);
module.version = "1.0.0";
module.exports = edit;
