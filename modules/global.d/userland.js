// ============================================================================
// Unix command wrappers
// ============================================================================
reboot = setapi ([
    {name:"reboot"},
    {literal:"reboot"},
    {helptext:"Reboots the system."}
]);

shutdown = setapi ([
    {name:"shutdown"},
    {literal:"shutdown"},
    {literal:"-h"},
    {arg:"when",def:"now",helptext:"Requested shutdown time"},
    {helptext:"Shuts down the system."}
]);

edit = setapi ([
    {name:"edit"},
    {setarg:"file"},
    {literal:function(){ return env.EDITOR; }},
    {arg:"file",helptext:"The file to edit"},
    {console:true},
    {helptext:"Opens a file in the default editor, as specified in "+
              "the env.EDITOR environment-variable."}
]);

if (sys.stat ("make")) {
    make = setapi ([
        {name:"make"},
        {literal:"make"},
        {opt:{"file":"-f"},helptext:"Use file instead of Makefile"},
        {opt:{"target":[]},helptext:"Build target"},
        {console:true},
        {helptext:"Runs the make build utility."}
    ]);
}

// ----------------------------------------------------------------------------
stty = setapi ([
    {name:"stty"},
    {setarg:"device"},
    {setarg:"speed"},
    {literal:"stty"},
    {literal:"-F"},
    {arg:"device",helptext:"Path of the tty device"},
    {arg:"speed",helptext:"Speed in bits/sec"},
    {helptext:"Sets serial device speed."}
]);
