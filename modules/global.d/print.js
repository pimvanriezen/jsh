// ============================================================================
// Various printing functions
// ============================================================================
strescape = function(str) {
    var res = "";
    for (var i=0; i<str.length; ++i) {
        var c = str[i];
        if (c == '\n') res += "\\n";
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

$isShortArray = function(arr) {
    if (arr.length > 12) return false;
    var totalWidth = 0;
    
    for (var i=0; i<arr.length; ++i) {
        if (typeof (arr[i]) == "object") {
            return false;
        }
        else if (typeof (arr[i]) == "string") totalWidth += arr[i].length;
        else if (typeof (arr[i]) == "number") totalWidth += 6;
        else {
            totalWidth += 10;
        }
    }
    
    if (totalWidth < 60) return true;
    return false;
}

$isShortObject = function(obj) {
    var k = Object.keys(obj).length;
    if (k > 3) return false;
    var totalWidth = 0;
    
    for (var i in obj) {
        if (typeof (obj[i]) == "object") return false;
        else if (typeof (obj[i]) == "string") totalWidth += obj[i].length;
        else if (typeof (obj[i]) == "number") totalWidth += 6;
        else {
            totalWidth += 10;
        }
        totalWidth += (""+i).length;
        if (totalWidth > 59) break;
    }
    
    if (totalWidth < 60) return true;
    return false;
}

$dumper = function(x,mkshort,indent,realindent) {
    var codes = {
        "number":"\033[34m",
        "key":"\033[97m",
        "string":"\033[32m",
        "boolean":"\033[1m",
        "null":"\033[31m",
        "function":"\033[36m",
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
    if (mkshort) indent = 0;
    var type = typeof(x);
    if (type == "object") {
        if (x === null) type = "null";
        else if (x.constructor == Array) type = "array";
    }
    switch (type) {
        case "string":
            if (indent) res += "".padEnd(indent);
            res += "\"" + codes["string"];
            res += strescape (x);
            res += codes.end + "\"";
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
            res += codes["function"] + "function() {...}" + codes.end;
            break;
                
        case "array":
            var isshort = $isShortArray (x);
            if (indent) res += "".padEnd(indent);
            res += "[";
            
            comma="";
            for (var i=0; i<x.length; ++i) {
                res += comma;
                if (! isshort) {
                    if (!mkshort) res += "\n";
                    res += "".padEnd(realindent+2);
                }
                comma = ",";
                res += $dumper (x[i],mkshort||isshort,0,realindent+2);
            }
            if (!isshort) {
                if (!mkshort) res += "\n";
                res+= "".padEnd(realindent);
            }
            res += "]";
            break;
        
        case "object":
            var isshort = $isShortObject (x);
            if (indent) res += "".padEnd(indent);
            res += "{";
            
            comma="";
            for (var i in x) {
                res += comma;
                if (! isshort) {
                    if (!mkshort) res += "\n";
                    res +="".padEnd(realindent+2);
                }
                comma = ",";
                res += "\"" + codes["key"];
                res += strescape (i);
                res += codes.end + "\":";
                res += $dumper (x[i],mkshort,0,realindent+2);
            }
            if (! isshort) {
                if (!mkshort) res += "\n";
                res += "".padEnd (realindent);
            }
            res += "}";
            break;
    }
    return res;
}

dump = function(x) {
    echo ($dumper (x));
}

dump.help = function() {
    setapi.helptext ({
        name:"dump",
        args:[
            {name:"object",text:"Object to dump"}
        ],
        text:"Pretty-prints an object as JSON to the console."
    });
}

jshFormat = function(x) {
    return $dumper(x,false,0,2);
}

String.prototype.wrap = function (cols) {
    var str = ""+this;
    var words = str.split (' ');
    var ln = "";
    var res = [];
    while (words.length) {
        if (ln.length + words[0].length + 1 > cols) {
            res.push (ln);
            ln = words.splice(0,1)[0];
        }
        else {
            ln = (ln?ln + ' ':'') + words.splice(0,1)[0];
        }
    }
    if (ln.length) res.push (ln);
    return res;
}

String.prototype.rewrap = function (cols) {
    var res = "";
    var str = ""+this;
    var paragraphs = str.split ("\n\n");
    for (var k in paragraphs) {
        var p = (""+paragraphs[k]).split("\n").join(" ");
        p = p.wrap(cols).join('\n');
        paragraphs[k] = p;
    }
    res = paragraphs.join("\n\n") + '\n';
    if (res.endsWith("\n\n")) {
        res = res.substr (0,res.length-1);
    }
    return res;   
}

String.prototype.colorMatch = function (expr, code) {
    var ansi = code;
    var re = expr;
    if (typeof (re) == "string") {
        if (re == "@function") {
            re = new RegExp ("[.a-zA-Z_]+\\([._a-zA-Z]*\\)","g");
        }
        else {
            re = new RegExp (expr, "g");
        }
    }
    if (typeof (code) == "number") {
        ansi = '\033[' + code + 'm';
    }
    var decor = function (match) {
        return ansi + match + '\033[0m';
    }
    
    return this.replace (re, decor);
}

texttable = function(cols) {
    this.columns = cols;
    this._stretchcolumn = cols-1;
    this._boldcolumn = -1;
    this._padding = 1;
    this._marginright = 1;
    this._indent = 0;
    this._nowrap = false;
    this.rows = [];
    this._colprefix = [];
    this._colsuffix = [];
    for (var i=0; i<cols; ++i) {
        this._colprefix.push ("");
        this._colsuffix.push ("");
    }
}

texttable.prototype.stretchColumn = function(c) {
    if (c < this.columns) this._stretchcolumn = c;
}

texttable.prototype.noWrap = function() {
    this._nowrap = true;
}

texttable.prototype.marginRight = function(i) {
    this._marginright = i;
}

texttable.prototype.boldColumn = function(c) {
    if (c < this.columns) {
        this._colprefix[c] = '\033[1m';
        this._colsuffix[c] = '\033[0m';
    }
}

texttable.prototype.colorColumn = function(c,color) {
    if (c < this.columns) {
        this._colprefix[c] = '\033[' + (30 + parseInt(color)) + 'm';
        this._colsuffix[c] = '\033[0m';
    }
}

texttable.prototype.padding = function(p) {
    this._padding = p;
}

texttable.prototype.indent = function(i) {
    this._indent = i;
}

texttable.prototype.addRow = function() {
    var row = [];
    var args = typeof(arguments[0]) == 'object' ? arguments[0] : arguments;
    
    for (var i=0; i<this.columns;++i) {
        if (i<args.length) row.push (args[i]);
        else row.push ("");
    }
    this.rows.push (row);
}

texttable.prototype.format = function() {
    var res = "";
    var maxw = sys.winsize() - this._marginright - this._indent -
               ((this.columns-1) * this._padding);
    if (maxw < this.columns) {
        res = "Content too wide\n";
        return res;
    }
    var widths = [];
    var totalwidth = 0;
    for (var c=0;c<this.columns;++c) {
        if (c == this._stretchcolumn) {
            widths[c] = 1;
        }
        else {
            var max = 1;
            for (var k in this.rows) {
                var s = ""+this.rows[k][c];
                if (s.length > max) max = s.length;
            }
            widths[c] = max;
            totalwidth += max;
        }
    }
    if (totalwidth >= maxw) {
        res = "Content too wide\n";
        return res;
    }
    widths[this._stretchcolumn] = (maxw - totalwidth);
    
    for (var ri in this.rows) {
        var out = [];
        var numlines = 0;
        
        for (var i=0; i<this.columns; ++i) {
            if (i == this._stretchcolumn) {
                if (this._nowrap) {
                    out[i] = [(""+this.rows[ri][i]).substr(0,widths[i])];
                }
                else {
                    out[i] = (""+this.rows[ri][i]).wrap(widths[i]);
                }
                // After wrapping, if we have the highest number of lines,
                // ours is what counts.
                if (out[i].length > numlines) numlines = out[i].length;
            }
            else {
                out[i] = [""+this.rows[ri][i]];
            }
        }
        
        var line = 0;
        for (var line=0; line<numlines; ++line) {
            var ln = "".padEnd(this._indent);
            var ww = 0;
            for (var i=0; i<this.columns; ++i) {
                if (this._colprefix[i]) {
                    if (out[i][line]) ln += this._colprefix[i];
                }
                var w = widths[i];
                var addcol;
                if ((i+1)<this.columns) w += this._padding;
                if (out[i].length > line) {
                    if ((i+1)<this.columns) addcol = out[i][line].padEnd (w);
                    else addcol = out[i][line];
                }
                else {
                    if ((i+1)<this.columns) addcol = ("").padEnd (w);
                }
                ln += addcol;
                ww += addcol.length;
                if (this._colsuffix[i]) {
                    if (out[i][line]) ln += this._colsuffix[i];
                }
                if (i == this._boldcolumn) {
                    if (out[i][line]) ln += '\033[0m';
                }
            }
            while ((ww>sys.winsize()) && (ln[0] == ' ')) {
                ln = ln.substr(1);
                ww--;
            }
            res += ln + '\n';
        }
    }
    return res;
}

autotable = function(arr, indent) {
    var res = "";
    if (! indent) indent = 0;
    var maxsz = 0;
    for (var i in arr) {
        if (arr[i].length > maxsz) maxsz = arr[i].length;
    }
    var ncol = (((sys.winsize() - indent) / (maxsz+2))-0.5).toFixed(0);
    ncol = parseInt (ncol);
    var curcol = 0;
    for (var i in arr) {
        if (! curcol) {
            if (indent) res += "".padEnd(indent);
        }
        if ((curcol+1) < ncol) {
            res += (""+arr[i]).padEnd(maxsz+2);
        }
        else res += ""+arr[i]+"\n";
        curcol++;
        if (curcol >= ncol) curcol = 0;
    }
    if (curcol) res += "\n";
    return res;
}
