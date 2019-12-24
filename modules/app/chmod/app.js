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

module.exports = chmod;
