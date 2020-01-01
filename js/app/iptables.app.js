if (which ("iptables")) {
    var iptables = {
        help:function(){echo ("Usage: iptables.add | iptables.remove | "+
                              "iptables.create");},
        // ====================================================================
        // FUNCTION iptables.add
        // ====================================================================
        add:setapi ([
            {name:"iptables.add"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
            {literal:"-A"},
            {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
            // ----------------------------------------------------------------
            // matching options
            // ----------------------------------------------------------------
            {opt:{"protocol":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
            {opt:{"inputInterface":"-i"},helptext:"Input device"},
            {opt:{"srcAddress":"--source"},helptext:"Source address"},
            {opt:{"srcPort":"--sport"},helptext:"Source port"},
            {opt:{"outputInterface":"-o"},helptext:"Output interface"},
            {opt:{"dstAddress":"--destination"},helptext:"Destination address"},
            {opt:{"dstPort":"--dport"},helptext:"Destination port"},
            {opt:{"state":["-m","conntrack","--ctstate"]},helptext:<<<`
                Conntrack state match
            `>>>},
            {opt:{"dstAddressType":["-m","addrtype","--dst-type"]},helptext:<<<`
                Destination Address type match
            `>>>},
            {opt:{"srcAddressType":["-m","addrtype","--src-type"]},helptext:<<<`
                Source Address type match
            `>>>},
            {opt:{"srcMatchSet":["-m","set","--match-set"]},helptext:<<<`
                Match against an ipset
            `>>>},
            {opt:{"comment":["-m","comment","--comment"]},helptext:"Comment"},
            // ----------------------------------------------------------------
            // target options
            // ----------------------------------------------------------------
            {
                opt:"saveMark",
                f:function(args) {
                    return ["-j","CONNMARK","--save-mark","--nfmask",
                                args.saveMark,"--ctmask",args.saveMark];
                },
                helptext:<<<`
                    Save mark with mask provided in value.
                `>>>
            },
            {
                opt:"restoreMark",
                f:function(args) {
                    return ["-j","CONNMARK","--restore-mark","--nfmask",
                            args.restoreMark,"--ctmask",args.restoreMark];
                },
                helptext:<<<`
                    Restore mark with mask provided as value.
                `>>>
            },
            {
                opt:"setMark",
                f:function(args) {
                    return ["-j","CONNMARK","--set-xmark",args.setMark];
                },
                helptext:<<<`
                    Set mark with value mask provided as string "value/mask".
                `>>>
            },
            {opt:{"dnat":["-j","DNAT","--to-destination"]},helptext:<<<`
                Set target to DNAT with a destination
            `>>>},
            {opt:{"snat":["-j","SNAT","--to-source"]},helptext:<<<`
                Set target with SNAT to a source
            `>>>},
            {opt:{"target":"-j"},helptext:"Target chain"},
            {helptext:"Adds a rule to a chain."}
        ]),
        
        // ====================================================================
        // FUNCTION iptables.remove
        // ====================================================================
        remove:setapi ([
            {name:"iptables.remove"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table (filter,nat,mangle)"},
            {literal:"-D"},
            {arg:"chain",helptext:"Chain to use (e.g. INPUT,FORWARD,...)"},
            // ----------------------------------------------------------------
            // matching options
            // ----------------------------------------------------------------
            {opt:{"proto":"-p"},helptext:"Protocol (tcp,udp,icmp,ip)"},
            {opt:{"inputInterface":"-i"},helptext:"Input interface"},
            {opt:{"srcAddress":"--source"},helptext:"Source address"},
            {opt:{"srcPort":"--sport"},helptext:"Source port"},
            {opt:{"outputInterface":"-o"},helptext:"Output interface"},
            {opt:{"dstAddress":"--destination"},helptext:"Destination address"},
            {opt:{"dstPort":"--dport"},helptext:"Destination port"},
            {opt:{"state":["-m","conntrack","--ctstate"]},helptext:<<<`
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
            {opt:{"comment":["-m","comment","--comment"]},helptext:"Comment"},
            // ----------------------------------------------------------------
            // target options
            // ----------------------------------------------------------------
            {
                opt:"saveMark",
                f:function(args) {
                    return ["-j","CONNMARK","--save-mark","--nfmask",
                                args.saveMark,"--ctmask",args.saveMark];
                },
                helptext:<<<`
                    Save mark with mask provided in value.
                `>>>
            },
            {
                opt:"restoreMark",
                f:function(args) {
                    return ["-j","CONNMARK","--restore-mark","--nfmask",
                            args.restoreMark,"--ctmask",args.restoreMark];
                },
                helptext:<<<`
                    Restore mark with mask provided as value.
                `>>>
            },
            {
                opt:"setMark",
                f:function(args) {
                    return ["-j","CONNMARK","--set-xmark",args.setMark];
                },
                helptext:<<<`
                    Set mark with value mask provided as string "value/mask".
                `>>>
            },
            {opt:{"dnat":["-j","DNAT","--to-destination"]},helptext:<<<`
                Set target to DNAT with a destination
            `>>>},
            {opt:{"snat":["-j","SNAT","--to-source"]},helptext:<<<`
                Set target with SNAT to a source
            `>>>},
            {opt:{"target":"-j"},helptext:"Target chain"},
            {helptext:"Removes a rule from a chain."}
        ]),
        
        // ====================================================================
        // FUNCTION iptables.create
        // ====================================================================
        create:setapi ([
            {name:"iptables.create"},
            {literal:"iptables"},
            {setarg:"chain"},
            {opt:{"table":"-t"},helptext:"Table to use (filter,nat,mangle)"},
            {literal:"-N"},
            {arg:"chain",helptext:"Name of the new chain"},
            {helptext:"Creates a chain."}
        ])
    }

    module.version = "1.0.1";
    module.exports = iptables;
};
