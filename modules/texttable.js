var texttable = function(cols) {
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
    this._colralign = [];
    for (var i=0; i<cols; ++i) {
        this._colprefix.push ("");
        this._colsuffix.push ("");
        this._colralign.push (false);
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

texttable.prototype.rightAlignColumn = function (c) {
    if (c<this.columns) this._colralign[c] = true;
}

texttable.prototype.leftAlignColumn = function (c) {
    if (c<this.columns) this._colralign[c] = false;
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

texttable.colorize = function(str) {
    var matches = {
        "[.a-zA-Z_]+\\([._a-zA-Z0-9]*\\)":1,
        "[.a-zA-Z_]+\\[['\"._a-zA-Z0-9]*\\]":1,
        "(\\b(true|false))":36,
        "(\\b(null))":31,
        "\"[^\"]+\"":32
    }
    x = str;
    for (var k in matches) {
        x = x.colorMatch (k, matches[k]);
    }
    return x;
}

texttable.auto = function (inputstr, cols) {
    var t = new texttable(cols);
    var cutw = [];
    var cutp = [0];
    var pos = 0;
    var col = 1;
    var output = [];
    
    while (col<cols) {
        while (inputstr[pos] != ' ' && inputstr[pos] != '\t') pos++;
        while (inputstr[pos] == ' ' || inputstr[pos] == '\t') pos++;
        cutw[col-1] = pos - cutp[col-1];
        cutp[col] = pos;
        col++;
    }
    cutw[cols-1] = 0;
    
    var lines = inputstr.split('\n');
    var output=[];
    
    for (var li in lines) {
        if (lines[li] == "") break;
        for (var i=0; i<cols; ++i) {
            var cdata="";
            if (cutw[i]) {
                cdata = lines[li].substr(cutp[i], cutw[i]);
            }
            else cdata = lines[li].substr(cutp[i]);
            cdata = cdata.replace (/[ \t]*$/, "");
            if (cdata) {
                if (i==0) {
                    if (output.length) t.addRow (output);
                    output = [];
                }
                if (output[i]) output[i] += " " + cdata;
                else output[i] = cdata;
            }
        }
    }
    if (output.length) t.addRow (output);
    return t;
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
                    var wrapped = (""+this.rows[ri][i]).rewrap(widths[i]);
                    wrapped = texttable.colorize(wrapped);
                    wrapped = wrapped.split('\n');
                    var l = wrapped.length;
                    if (l) {
                        wrapped = wrapped.slice (0,l-1);
                    }
                    out[i] = wrapped;
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
                var padf = this._colralign[i] ? "padStart":"padEnd";
                if (this._colprefix[i]) {
                    if (out[i][line]) ln += this._colprefix[i];
                }
                var w = widths[i];
                var addcol;
                if ((i+1)<this.columns) w += this._padding;
                if (out[i].length > line) {
                    if ((i+1)<this.columns) {
                        addcol = out[i][line][padf] (w - this._padding);
                        addcol = addcol.padEnd (w);
                    }
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
            res += ln + '\n';
        }
    }
    return res;
}

module.exports = texttable;
