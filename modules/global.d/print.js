// ============================================================================
// Various printing functions
// ============================================================================
dump = function(x) {
    var codes = {
        "number":"\033[34m",
        "key":"\033[97m",
        "string":"\033[32m",
        "boolean":"\033[36m",
        "null":"\033[31m"
    }
    if (typeof (x) == "object") {
        var json = JSON.stringify(x,null,2);
        if (env.TERM != "vt100") {
            var re = new RegExp ('("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"'+
                                 '(\\s*:)?|\\b(true|false|null)\\b|-?\\d+'+
                                 '(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)','g');
            json = json.replace(re, function (match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }
                return codes[cls] + match + '\033[0m';
            });
        }
        print (json + '\033[0m\n');
    }
    else console.log (x);
}

dump.help = function() {
    echo ("Usage: dump (object)");
    echo ("");
    echo ("Pretty-prints an object to the console.");
}

