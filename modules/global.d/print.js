// ============================================================================
// Various printing functions
// ============================================================================
printerr = function(e) {
    console.log ("% " + e);
}

print = function(x) {
    if (typeof (x) == "string") return sys.print (x);
    if (typeof (x) == "object") return sys.print (JSON.stringify (x));
    sys.print ("" + x);
}

echo = console.log;

dump = function(x) {
    if (typeof (x) == "object") console.log (JSON.stringify(x,null,2));
    else console.log (x);
}

dump.help = function() {
    echo ("Usage: dump (object)");
    echo ("");
    echo ("Pretty-prints an object to the console.");
}

