// ============================================================================
// Various printing functions
// ============================================================================
cat = function(fn) {
    if (sys.stat (fn)) print (sys.read (fn));
    else return false;
}

cat.help = function() {
    setapi.helptext ({
        name:"cat",
        args:[
            {name:"filename",text:"File to output"}
        ],
        text:"Prints the raw contents of a file to the console."
    });
}

setapi (cat, "cat");
