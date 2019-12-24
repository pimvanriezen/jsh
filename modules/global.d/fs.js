humanSize = function (sz) {
    var res = sz;
    var factor = "";
    var factors = ["K","M","G","T"];
    for (var i in factors) {
        if (res > 10000) {
            res = res/1024;
            factor = factors[i];
        }
        else break;
    }
    return "" + res.toFixed(0) + factor;
}

// ============================================================================
// Working directory tools
// ============================================================================
cwd = sys.cwd;
cwd.help = function() {
    setapi.helptext ({
        name:"cwd",
        text:"Returns the current working directory"
    });
}

setapi (cwd, "cwd");
