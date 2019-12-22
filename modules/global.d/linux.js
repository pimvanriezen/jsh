// ============================================================================
// Unix command wrappers
// ============================================================================

// ----------------------------------------------------------------------------
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
        {opt:{"input":"-i"},helptext:"Input interface"},
        {opt:{"src":"--source"},helptext:"Source address"},
        {opt:{"srcport":"--sport"},helptext:"Source port"},
        {opt:{"output":"-o"},helptext:"Output interface"},
        {opt:{"dst":"--destination"},helptext:"Destination address"},
        {opt:{"dstport":"--dport"},helptext:"Destination port"},
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
};

// ----------------------------------------------------------------------------
hwclock = setapi([
    {name:"hwclock"},
    {literal:"hwclock"},
    {literal:"-r"},
    {helptext:"Reads out the hardware clock."}
]);

hwclock.load = setapi([
    {name:"hwclock.load"},
    {literal:"hwclock"},
    {literal:"--hctosys"},
    {helptext:"Loads hardware clock into system clock."}
]);

hwclock.save = setapi([
    {name:"hwclock.save"},
    {literal:"hwclock"},
    {literal:"--systohc"},
    {helptext:"Saves system clock into hardware clock."}
]);

// ----------------------------------------------------------------------------
mount = setapi ([
    {name:"mount"},
    {literal:"mount"},
    {setarg:"device"},
    {setarg:"at"},
    {opt:{"type":"-t"},helptext:"Filesystem type"},
    {opt:{"options":"-o"},helptext:"Mount options (fs-specific)"},
    {arg:"device",helptext:"Device name"},
    {arg:"at",helptext:"Mount point"},
    {helptext:"Mounts a filesystem."}
]);

mount.all = setapi ([
    {name:"mount.all"},
    {literal:"mount"},
    {opt:{"type":"-t"},helptext:"Filesystem type"},
    {literal:"-a"},
    {helptext:"Mounts all filesystems set up in /etc/fstab."}
]);

// ----------------------------------------------------------------------------
cp = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"cp"},
    {flag:{"preserve":"-p"},helptext:"Preserve permissions"},
    {arg:"from",helptext:"Source file"},
    {arg:"to",helptext:"Destination path"},
    {helptext:"Copies a file."}
]);

// ----------------------------------------------------------------------------
mv = setapi ([
    {setarg:"from"},
    {setarg:"to"},
    {literal:"mv"},
    {arg:"from",helptext:"Original name/location"},
    {arg:"to",helptext:"New name/location"},
    {helptext:"Moves/renames a filesystem object."}
]);

// ----------------------------------------------------------------------------
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
        {helptext:"Creates a softlink."}
    ]),
    hard:setapi([
        {name:"ln.hard"},
        {setarg:"to"},
        {setarg:"path"},
        {literal:"ln"},
        {arg:"to",helptext:"Filesystem object to link to"},
        {arg:"path",helptext:"Location of the link to be created"},
        {helptext:"Creates a hardlink."}
    ])
};

// ----------------------------------------------------------------------------
var $signal_mkapi = function(type) {
    return setapi([
        {name:"signal."+type.toLowerCase()},
        {setarg:"pid"},
        {literal:"kill"},{literal:"-"+type},
        {arg:"pid",helptext:"Process id to signal"},
        {helptext:"Sends SIG"+type+" signal to process."}
    ]);
};

signal = {
    help:function(){echo ("Usage: signal.term | signal.kill | "+
                          "signal.stop | signal.hup | signal.resume | "+
                          "signal.usr1");},
    term:$signal_mkapi("TERM"),
    kill:$signal_mkapi("KILL"),
    stop:$signal_mkapi("STOP"),
    hup:$signal_mkapi("HUP"),
    resume:$signal_mkapi("RESUME"),
    usr1:$signal_mkapi("USR1")
};

// ----------------------------------------------------------------------------
rm = setapi ([
    {setarg:"target"},
    {literal:"rm"},
    {flag:{"recursive":"-r"},helptext:"Remove recursively"},
    {flag:{"force":"-f"},helptext:"Overrule permissions"},
    {arg:"target",helptext:"Object/path to remove"},
    {helptext:"Deletes filesystem object(s)."}
]);

// ----------------------------------------------------------------------------
chmod = setapi ([
    {name:"chmod"},
    {setarg:"path"},
    {setarg:"mode"},
    {arg:"path",helptext:"Object to change"},
    {arg:"mode",helptext:"Permissions (number or change string)"},
    {f:function(args) {
        if (! exists (args.path)) return false;
        var mode = args.mode;
        var mmap = {"r":0444,"w":0222,"x":0111,"s":07000};
        var wmap = {"a":07777,"u":04700,"g":02070,"o":01007};
        var do_and = 0777;
        if (typeof (mode) == "string") {
            var curmode = stat(args.path).mode & 07777;
            var newmode = null;
            if (wmap[mode[0]]) {
                do_and = wmap[mode[0]];
                if (mode[1] == '+' || mode[1] == '-') {
                    if (mmap[mode[2]]) {
                        var outmode = mmap[mode[2]] & do_and;
                        if (mode[1] == '+') {
                            newmode = curmode | outmode;
                        }
                        else {
                            newmode = curmode & (~outmode);
                        }
                    }
                }
            }
            if (! newmode) return false;
            mode = newmode;
        }
        return sys.chmod (args.path, mode);
    }},
    {helptext:<<<
        Changes file permissions. Accepts either an integer for the new
        mode or a relative specification, e.g. "a+x".
    >>>}
]);

// ----------------------------------------------------------------------------
var md5cmd = "md5sum"
if (! which("md5sum")) md5cmd = "md5";

md5sum = setapi ([
    {name:"md5sum"},
    {setarg:"path"},
    {literal:md5cmd},
    {arg:"path",helptext:"File to checksum"},
    {process:function(dat) {
        dat = dat.replace('\n','');
        if (md5cmd == "md5sum") return dat.split(' ')[0];
        return dat.replace (/^.* /,"");
    }},
    {helptext:"Get md5 checksum for a file."}
]);

// ----------------------------------------------------------------------------
chown = setapi ([
    {name:"chown"},
    {setarg:"path"},
    {setarg:"owner"},
    {arg:"path",helptext:"Object to change"},
    {arg:"owner",helptext:"New owner (username or userid)"},
    {f:function(args) {
        if (! exists (args.path)) return false;
        if (! userdb[args.owner]) return false;
        var uid = userdb[args.owner].uid;
        var gid = stat(args.path).gid;
        sys.chown (path, uid, gid);
    }},
    {helptext:"Change owner of filesystem object."}
]);

// ----------------------------------------------------------------------------
hostname = function(nm) {
    if (nm) return sys.hostname (nm);
    else return sys.hostname();
}

hostname.help = function() {
    setapi.helptext ({
        name:"hostname",
        args:[
            {name:"newname",text:"New hostname, leave empty to obtain the "+
                                 "currently configured name."}
        ],
        text:"Gets or sets the hostname."
    });
}

// ----------------------------------------------------------------------------
mkdir = setapi ([
    {name:"mkdir"},
    {setarg:"path"},
    {arg:"path",helptext:"Path of directory to create"},
    {arg:"mode",def:0755,helptext:"Permissions (number)"},
    {f:function(args) {
        if (typeof (args.mode) != "number") {
            printerr ("Illegal mode, expecting number");
            return false;
        }
        return sys.mkdir (args.path, args.mode);
    }},
    {helptext:"Creates a directory."}
]);

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
