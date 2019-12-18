// ============================================================================
// Various printing functions
// ============================================================================
dump = function(x) {
    if (typeof (x) == "object") console.log (JSON.stringify(x,null,2));
    else console.log (x);
}

dump.help = function() {
    echo ("Usage: dump (object)");
    echo ("");
    echo ("Pretty-prints an object to the console.");
}

