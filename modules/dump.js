// ============================================================================
// FUNCTION strescape
// ------------------
// Escapes a string to make it safe for within double quotes in the context
// of parsed javascript.
// ============================================================================
var strescape = function(str) {
    var res = "";
    for (var i=0; i<str.length; ++i) {
        var c = str[i];
        if (c == '\n') res += "\\n";
        else if (c == '\r') res += "\\r";
        else if (c.charCodeAt(0) < 32) {
            res += "\\" + c.charCodeAt(0).toString(16) + "x";
        }
        else if (c == '"') {
            res += "\\\"";
        }
        else res += c;
    }
    return res;
}

// ============================================================================
// FUNCTION isShortArray
// ---------------------
// Determines whether an array would fit on one line on the screen, if
// encoded as JSON.
// ============================================================================
var isShortArray = function(arr,indent) {
    if (arr.length > 12) return false;
    var totalWidth = 2;
    
    for (var i=0; i<arr.length; ++i) {
        if (typeof (arr[i]) == "object") {
            return false;
        }
        else if (typeof (arr[i]) == "string") totalWidth += arr[i].length;
        else if (typeof (arr[i]) == "number") totalWidth += 6;
        else if (typeof (arr[i]) == "function") totalWidth += 16;
        else {
            totalWidth += 10;
        }
        totalWidth += 3;
        if (totalWidth >= (sys.winsize() - indent)) break;
    }
    
    if (totalWidth < (sys.winsize() - indent)) return true;
    return false;
}

// ============================================================================
// FUNCTION isShortObject
// ---------------------
// Determines whether an object would fit on one line on the screen, if
// encoded as JSON.
// ============================================================================
var isShortObject = function(obj,indent) {
    var k = Object.keys(obj).length;
    if (k > 3) return false;
    var totalWidth = 0;
    
    for (var i in obj) {
        if (typeof (obj[i]) == "object") return false;
        else if (typeof (obj[i]) == "string") totalWidth += obj[i].length;
        else if (typeof (obj[i]) == "number") totalWidth += 6;
        else if (typeof (obj[i]) == "function") totalWidth += 16;
        else {
            totalWidth += 10;
        }
        totalWidth += (""+i).length;
        totalWidth += 6;
        if (totalWidth >= (sys.winsize() - indent)) break;
    }
    
    if (totalWidth < (sys.winsize() - indent)) return true;
    return false;
}

// ============================================================================
// FUNCTION dump
// -------------
// Dumps the passed argument as colorized JSON.
// ============================================================================
var dump = function(x,mkshort,indent,realindent,realpos) {
    echo (dump.dumper (x,mkshort,indent,realindent,realpos));
}

// ============================================================================
// FUNCTION dump.dumper
// --------------------
// Actual implementation, dumps the JSON into a string. Needed for the
// cli.
// ============================================================================
dump.dumper = function(x,mkshort,indent,realindent,realpos) {
    var codes = {
        "number":"\033[34m",
        "key":"\033[97m",
        "string":"\033[32m",
        "boolean":"\033[36m",
        "null":"\033[31m",
        "function":"\033[33m",
        "end":"\033[0m"
    }
    if (env.TERM == "vt100") {
        codes = {
            "number":"",
            "key":"",
            "string":"",
            "boolean":"\033[1m",
            "null":"\033[1m",
            "function":"\033[1m",
            "end":"\033[0m"
        }
    }
    
    var res = "";
    var comma="";
    if (! indent) indent = 0;
    if (! realindent) realindent = indent;
    if (! realpos) realpos = realindent;
    if (mkshort) indent = 0;
    var type = typeof(x);
    if (type == "object") {
        if (x === null) type = "null";
        else if (x.constructor == Array) type = "array";
        else if (x.constructor == Date) type = "date";
    }
    switch (type) {
        case "string":
            if (indent) res += "".padEnd(indent);
            res += "\"" + codes["string"];
            res += strescape (x);
            res += codes.end + "\"";
            break;
            
        case "date":
            if (indent) res += "".padEnd(indent);
            res += "\"";
            res += x.toLocaleString();
            res += "\"";
            break;
            
        case "number":
            if (indent) res += "".padEnd(indent);
            res += codes["number"] + x + codes.end;
            break;
        
        case "boolean":
            if (indent) res += "".padEnd(indent);
            res += codes["boolean"] + (x?"true":"false") + codes.end;
            break;
        
        case "null":
        case "undefined":
            if (indent) res += "".padEnd(indent);
            res += codes["null"] + type + codes.end;
            break;
            
        case "function":
            if (indent) res += "".padEnd(indent);
            res += codes["function"] + "function() "+codes.end+"{...}";
            break;
                
        case "array":
            var isshort = isShortArray (x,realpos);
            if (indent) res += "".padEnd(indent);
            res += "[";
            
            comma="";
            for (var i=0; i<x.length; ++i) {
                res += comma;
                if (! isshort) {
                    if (!mkshort) {
                        res += "\n";
                        res += "".padEnd(realindent+2);
                    }
                }
                comma = ",";
                res += dump.dumper (x[i],mkshort||isshort,0,realindent+2);
            }
            if (!isshort) {
                if (!mkshort) {
                    res += "\n";
                    res+= "".padEnd(realindent);
                }
            }
            res += "]";
            break;
        
        case "object":
            var isshort = isShortObject (x,realpos);
            if (indent) res += "".padEnd(indent);
            res += "{";
            
            comma="";
            for (var i in x) {
                res += comma;
                if (! isshort) {
                    if (!mkshort) {
                        res += "\n";
                        res +="".padEnd(realindent+2);
                    }
                }
                comma = ",";
                res += "\"" + codes["key"];
                var esc = strescape (i);
                res += esc;
                res += codes.end + "\":";
                
                // We use the length of esc to tell the child
                // function where we are so it can use isShortFoo()
                // reliably.
                res += dump.dumper (x[i],mkshort,0,realindent+2,
                                    realindent+2+esc.length+3);
            }
            if (! isshort) {
                if (!mkshort) {
                    res += "\n";
                    res += "".padEnd (realindent);
                }
            }
            res += "}";
            break;
    }
    return res;
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
dump.help = function() {
    setapi.helptext ({
        name:"dump",
        args:[
            {name:"object",text:"Object to dump"}
        ],
        text:"Pretty-prints an object as JSON to the console."
    });
}

module.exports = dump;
