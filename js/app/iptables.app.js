if (which ("iptables")) {
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
            {opt:{"ctstate":["-m","conntrack","--ctstate"]},helptext:<<<`
                Conntrack state match
            `>>>},
            {opt:{"dstAddressType":["-m","addrtype","--dst-type"]},helptext:<<<`
                Destination Address type match
            `>>>},
            {opt:{"srcAddressType":["-m","addrtype","--src-type"]},helptext:<<<`
                Source Address type match
            `>>>},
            {opt:{"srcMatchSet":["-m","set","--match-set"]},helptext:<<<`
                Match against a set
            `>>>},
            {literal:function(args) {
                if (args.saveMark) {
                    return ["-j","CONNMARK","--save-mark","--nfmask",
                            args.saveMark,"--ctmask",args.saveMark];
                }
                else if (args.restoreMark) {
                    return ["-j","CONNMARK","--restore-mark","--nfmask",
                            args.restoreMark,"--ctmask",args.restoreMark];
                }
                else if (args.setMark) {
                    return ["-j","CONNMARK","--set-xmark",args.setMark];
                }
                return;
            }},
            {silentopt:"saveMark",text:<<<`
                Save mark with mask provided as value
            `>>>},
            {silentopt:"restoreMark",text:<<<`
                Restore mark with mask provided as value
            `>>>},
            {silentopt:"saveMark",text:<<<`
                Set mark with value mask provided as string "value/mask"
            `>>>},
            {opt:{"dnat":["-j","DNAT","--to-destination"]},helptext:<<<`
                Set target to DNAT with a destination
            `>>>},
            {opt:{"snat":["-j","SNAT","--to-source"]},helptext:<<<`
                Set target with SNAT to a source
            `>>>},
            {opt:{"comment":["-m","comment","--comment"]},helptext:"Comment"},
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
            {opt:{"ctstate":["-m","conntrack","--ctstate"]},helptext:<<<`
                Conntrack state match
            `>>>},
            {opt:{"dstAddressType":["-m","addrtype","--dst-type"]},helptext:<<<`
                Destination Address type match
            `>>>},
            {opt:{"srcAddressType":["-m","addrtype","--src-type"]},helptext:<<<`
                Source Address type match
            `>>>},
            {opt:{"srcMatchSet":["-m","set","--match-set"]},helptext:<<<`
                Match against a set
            `>>>},
            {literal:function(args) {
                if (args.saveMark) {
                    return ["-j","CONNMARK","--save-mark","--nfmask",
                            args.saveMark,"--ctmask",args.saveMark];
                }
                else if (args.restoreMark) {
                    return ["-j","CONNMARK","--restore-mark","--nfmask",
                            args.restoreMark,"--ctmask",args.restoreMark];
                }
                else if (args.setMark) {
                    return ["-j","CONNMARK","--set-xmark",args.setMark];
                }
                return;
            }},
            {silentopt:"saveMark",text:<<<`
                Save mark with mask provided as value
            `>>>},
            {silentopt:"restoreMark",text:<<<`
                Restore mark with mask provided as value
            `>>>},
            {silentopt:"saveMark",text:<<<`
                Set mark with value mask provided as string "value/mask"
            `>>>},
            {opt:{"dnat":["-j","DNAT","--to-destination"]},helptext:<<<`
                Set target to DNAT with a destination
            `>>>},
            {opt:{"snat":["-j","SNAT","--to-source"]},helptext:<<<`
                Set target with SNAT to a source
            `>>>},
            {opt:{"comment":["-m","comment","--comment"]},helptext:"Comment"},
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

    module.version = "1.0.1";
    module.exports = iptables;
};
