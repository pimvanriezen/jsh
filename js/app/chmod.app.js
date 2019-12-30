var chmod = setapi ([
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
        var do_and = 0;
        if (typeof (mode) == "string") {
            var curmode = stat(args.path).mode & 07777;
            var newmode = null;
            var i = 0;
            while (wmap[mode[i]]) {
                do_and |= wmap[mode[i]];
                i++;
            }
            if (mode[i] == '+' || mode[i] == '-') {
                var act = mode[i];
                var outmode = 0;
                i++;
                while (mmap[mode[i]]) {
                    outmode |= mmap[mode[i]];
                    i++;
                }
                outmode &= do_and;
                if (act == '+') newmode = curmode|outmode;
                else newmode = curmode & (~outmode);
            }
            if (newmode === null) return false;
            mode = newmode;
        }
        return sys.chmod (args.path, mode);
    }},
    {helptext:<<<`
        Changes file permissions. Accepts either an integer for the new
        mode or a relative specification, e.g. "a+x".
    `>>>}
]);

module.version = "1.0.1";
module.exports = chmod;
