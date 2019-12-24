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

module.exports = texttable;
