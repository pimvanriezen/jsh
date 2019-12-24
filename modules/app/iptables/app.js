if (sys.stat ("iptables")) {
    var iptables = {
        help:function(){echo ("Usage: iptables.add | iptables.remove | "+
                              "iptables.create");},
        add:setapi ([
            {name:"iptables.add"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
            {literal:"-a"},
            {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
            {opt:{"protocol":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
            {opt:{"inputInterface":"-i"},helptext:"Input device"},
            {opt:{"srcAddress":"--source"},helptext:"Source address"},
            {opt:{"srcPort":"--sport"},helptext:"Source port"},
            {opt:{"outputInterface":"-o"},helptext:"Output interface"},
            {opt:{"dstAddress":"--destination"},helptext:"Destination address"},
            {opt:{"dstPort":"--dport"},helptext:"Destination port"},
            {opt:{"state":["-m","state","--state"]},helptext:"State match"},
            {opt:{"target":"-j"},helptext:"Target chain"},
            {helptext:"Adds a rule to a chain."}
        ]),
        remove:setapi ([
            {name:"iptables.remove"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
            {literal:"-d"},
            {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
            {opt:{"proto":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
            {opt:{"inputInterface":"-i"},helptext:"Input interface"},
            {opt:{"srcAddress":"--source"},helptext:"Source address"},
            {opt:{"srcPort":"--sport"},helptext:"Source port"},
            {opt:{"outputInterface":"-o"},helptext:"Output interface"},
            {opt:{"dstAddress":"--destination"},helptext:"Destination address"},
            {opt:{"dstPort":"--dport"},helptext:"Destination port"},
            {opt:{"state":["-m","state","--state"]},helptext:"State match"},
            {opt:{"target":"-j"},helptext:"Target chain"},
            {helptext:"Removes a rule from a chain."}
        ]),
        create:setapi ([
            {name:"iptables.create"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table to use (filter,nat,mangle)"},
            {literal:"-C"},
            {arg:"chain",helptext:"Name of the new chain"},
            {helptext:"Creates a chain."}
        ])
    }

    module.version = "1.0.0";
    module.exports = iptables;
};
