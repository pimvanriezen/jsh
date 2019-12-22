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

mkdump = function(x,mkshort) {
    var codes = {
        "number":"\033[34m",
        "key":"\033[97m",
        "string":"\033[32m",
        "boolean":"\033[36m",
        "null":"\033[31m",
        "function":"\033[1m",
        "end":"\033[0m"
    }
    if (typeof (x) == "object") {
        var json;
        if (mkshort) {
            json = JSON.stringify (x);
            if (json.length < 500) json = JSON.stringify (x,null,2);
        }
        else {
            json = JSON.stringify(x,null,2);
        }
        if (env.TERM != "vt100") {
            var re = new RegExp ('("(\\\\u[.+- /a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"'+
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
                return codes[cls] + match + codes.end;
            });
        }
        return (json + codes.end);
    }
    else if (typeof (x) == "boolean") {
        return codes.boolean + (x?"true":"false") + codes.end;
    }
    else if (typeof (x) == "number") {
        return codes.number + x + codes.end;
    }
    else if (typeof (x) == "null") {
        return codes["null"] + "null" + codes.end;
    }
    else if (typeof (x) == "function") {
        return codes["function"]+"function()"+codes.end+" {..js code..}";
    }
    return codes["string"]+'"'+strescape(x)+'"'+codes.end;
}

dump = function(x) {
    echo (mkdump (x));
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
    return mkdump(x,true);
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
        var p = paragraphs[k].split("\n").join(" ");
        p = p.wrap(cols).join('\n');
        paragraphs[k] = p;
    }
    res = paragraphs.join("\n\n") + '\n';
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
    this.stretchcolumn = cols-1;
    this.boldcolumn = -1;
    this.padding = 1;
    this.rows = [];
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
    var maxw = sys.winsize() - 1 - ((this.columns-1) * this.padding);
    if (maxw < this.columns) {
        res = "Content too wide\n";
        return res;
    }
    var widths = [];
    var totalwidth = 0;
    for (var c=0;c<this.columns;++c) {
        if (c == this.stretchcolumn) {
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
    widths[this.stretchcolumn] = maxw - totalwidth;
    
    for (var ri in this.rows) {
        var out = [];
        var numlines = 0;
        
        for (var i=0; i<this.columns; ++i) {
            if (i == this.stretchcolumn) {
                out[i] = (""+this.rows[ri][i]).wrap(widths[i]);
                if (out[i].length > numlines) numlines = out[i].length;
            }
            else {
                out[i] = [""+this.rows[ri][i]];
            }
        }
        
        var line = 0;
        for (var line=0; line<numlines; ++line) {
            for (var i=0; i<this.columns; ++i) {
                if (i == this.boldcolumn) {
                    res += '\033[1m';
                }
                var w = widths[i];
                var addcol;
                if ((i+1)<this.columns) w += this.padding;
                if (out[i].length > line) {
                    if ((i+1)<this.columns) addcol = out[i][line].padEnd (w);
                    else addcol = out[i][line];
                }
                else {
                    if ((i+1)<this.columns) addcol = ("").padEnd (w);
                }
                res += addcol;
                if (i == this.boldcolumn) {
                    res += '\033[0m';
                }
            }
            res += '\n';
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
