// ============================================================================
// Unix command wrappers
// ============================================================================
iptables = {
    help:function(){echo ("Usage: iptables.add | iptables.remove | "+
                          "iptables.create");},
    add:setapi ([
        {name:"iptables.add"},
        {literal:"iptables"},
        {setarg:"chain"},
        {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
        {literal:"-a"},
        {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
        {opt:{"proto":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
        {opt:{"input":"-i"},helptext:"Input interface"},
        {opt:{"src":"--source"},helptext:"Source address"},
        {opt:{"srcport":"--sport"},helptext:"Source port"},
        {opt:{"output":"-o"},helptext:"Output interface"},
        {opt:{"dst":"--destination"},helptext:"Destination address"},
        {opt:{"dstport":"--dport"},helptext:"Destination port"},
        {opt:{"state":["-m","state","--state"]},helptext:"State match"},
        {opt:{"target":"-j"},helptext:"Target chain"},
        {helptext:"Adds a rule to a chain"}
    ]),
    remove:setapi ([
        {name:"iptables.remove"},
        {literal:"iptables"},
        {setarg:"chain"},
        {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
        {literal:"-d"},
        {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
        {opt:{"proto":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
        {opt:{"input":"-i"},helptext:"Input interface"},
        {opt:{"src":"--source"},helptext:"Source address"},
        {opt:{"srcport":"--sport"},helptext:"Source port"},
        {opt:{"output":"-o"},helptext:"Output interface"},
        {opt:{"dst":"--destination"},helptext:"Destination address"},
        {opt:{"dstport":"--dport"},helptext:"Destination port"},
        {opt:{"state":["-m","state","--state"]},helptext:"State match"},
        {opt:{"target":"-j"},helptext:"Target chain"},
        {helptext:"Removes a rule from a chain"}
    ]),
    create:setapi ([
        {name:"iptables.create"},
        {literal:"iptables"},
        {setarg:"chain"},
        {opt:{"table":"-t"},helptext:"Table to use (filter,nat,mangle)"},
        {literal:"-C"},
        {arg:"chain",helptext:"Name of the new chain"},
        {helptext:"Creates a chain"}
    ])
};

cp = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"cp"},
    {arg:"from"},
    {arg:"to"},
    {helptext:"Copies a file"}
]);

mv = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"mv"},
    {arg:"from",helptext:"Original name/location"},
    {arg:"to",helptext:"New name/location"},
    {helptext:"Moves/renames a filesystem object"}
]);

ln = {
    help:function(){echo ("Usage: ln.soft | ln.hard");},
    soft:setapi([
        {name:"ln.soft"},
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {literal:"-s"},
        {arg:"to",helptext:"Filesystem object to link to"},
        {arg:"path",helptext:"Location of the link to be created"},
        {helptext:"Creates a softlink"}
    ]),
    hard:setapi([
        {name:"ln.hard"},
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {arg:"to",helptext:"Filesystem object to link to"},
        {arg:"path",helptext:"Location of the link to be created"},
        {helptext:"Creates a hardlink"}
    ])
};

signal = {
    help:function(){echo ("Usage: signal.TERM | signal.KILL | "+
                          "signal.STOP | signal.HUP | signal.RESUME | "+
                          "singal.USR1");},
    TERM:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-TERM"},{arg:"pid"}
    ]),
    KILL:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-KILL"},{arg:"pid"}
    ]),
    STOP:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    HUP:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    RESUME:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-STOP"},{arg:"pid"}
    ]),
    USR1:setapi([
        {setarg:"pid"},{literal:"kill"},{literal:"-USR1"},{arg:"pid"}
    ])
};

rm = setapi ([
    {setarg:"target"},
    {literal:"rm"},
    {flag:{"recursive":"-r"},helptext:"Remove recursively"},
    {flag:{"force":"-f"},helptext:"Overrule permissions"},
    {arg:"target",helptext:"Object/path to remove"},
    {helptext:"Deletes filesystem object(s)."}
]);
