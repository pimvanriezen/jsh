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
    setapi.helptext ({
        name:"dump",
        args:[
            {name:"object",text:"Object to dump"}
        ],
        text:"Pretty-prints an object as JSON to the console."
    });
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
