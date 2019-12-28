// ============================================================================
// FUNCTION sys.ps
// ---------------
// Currently uses the system ps command. Something a bit more nifty might
// be needed at some point.
// ============================================================================
sys.ps = function(matchopt) {
    var fields = [
        "user",
        "pid",
        "pcpu",
        "pmem",
        "vsz",
        "rss",
        "tty",
        "stat",
        "started",
        "time",
        "command"
    ];
    
    var pid = 0;
    var match = {};
    if (matchopt) {
        for (var mk in matchopt) {
            if (mk == pid) pid = parseInt(matchopt[mk]);
            else match[mk] = new RegExp(matchopt[mk]);
        }
    }

    var psout;
    if (! pid) psout = run ("ps axuw");
    else psout = run ("ps axuw "+pid);
    
    var res = {};
    var listing = psout.replace(/  */g, " ").split('\n');
    for (var ri=1;ri<listing.length;++ri) {
        var row = listing[ri].split(' ');
        var rowdata = {};
        for (var i=0; i<fields.length;++i) {
            if (i+1 < fields.length) {
                var cell = row.splice(0,1)[0];
                var cellstr = ""+cell;
                if (cellstr.indexOf(':') < 0) {
                    if (cell == "0.0" ||
                        (cellstr.indexOf(".")>0 && parseFloat(cell))) {
                        cell = parseFloat(cell).toFixed(2);
                    }
                    else if (cell == "0" || parseInt(cell)) {
                        cell = parseInt(cell);
                    }
                }
                rowdata[fields[i]] = cell;
            }
            else {
                rowdata[fields[i]] = row.join(' ');
            }
            if (rowdata.pid && rowdata.command) {
                var printit = true;
                if (matchopt) {
                    for (var mi in matchopt) {
                        if (! (""+rowdata[mi]).match (matchopt[mi])) {
                            printit = false;
                            break;
                        }
                    }
                }
                if (printit) res[rowdata.pid] = rowdata;
            }
        }
    }
    return res;
}
