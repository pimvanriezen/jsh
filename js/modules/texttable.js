// ============================================================================
// CONSTRUCTOR TextTable
// ============================================================================
var TextTable = function(cols) {
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

// ============================================================================
// METHOD TextTable::stretchColumn
// ============================================================================
TextTable::stretchColumn = function(c) {
    if (c < this.columns) this._stretchcolumn = c;
    return this;
}

// ============================================================================
// METHOD TextTable::noWrap
// ============================================================================
TextTable::noWrap = function() {
    this._nowrap = true;
    return this;
}

// ============================================================================
// METHOD TextTable::summarize
// ============================================================================
TextTable::summarize = function() {
    this._summarize = true;
    return this;
}

// ============================================================================
// METHOD TextTable::marginRight
// ============================================================================
TextTable::marginRight = function(i) {
    this._marginright = i;
    return this;
}

// ============================================================================
// METHOD TextTable::boldColumn
// ============================================================================
TextTable::boldColumn = function(c) {
    if (c < this.columns) {
        this._colprefix[c] = '\033[1m';
        this._colsuffix[c] = '\033[0m';
    }
    return this;
}

// ============================================================================
// METHOD TextTable::colorColumn
// ============================================================================
TextTable::colorColumn = function(c,color) {
    if (c < this.columns) {
        this._colprefix[c] = '\033[' + (30 + parseInt(color)) + 'm';
        this._colsuffix[c] = '\033[0m';
    }
    return this;
}

// ============================================================================
// METHOD TextTable::rightAlignColumn
// ============================================================================
TextTable::rightAlignColumn = function (c) {
    if (c<this.columns) this._colralign[c] = true;
    return this;
}

// ============================================================================
// METHOD TextTable::leftAlignColumn
// ============================================================================
TextTable::leftAlignColumn = function (c) {
    if (c<this.columns) this._colralign[c] = false;
    return this;
}

// ============================================================================
// METHOD TextTable::padding
// ============================================================================
TextTable::padding = function(p) {
    this._padding = p;
    return this;
}

// ============================================================================
// METHOD TextTable::indent
// ============================================================================
TextTable::indent = function(i) {
    this._indent = i;
    return this;
}

// ============================================================================
// METHOD TextTable::addRow
// ============================================================================
TextTable::addRow = function() {
    var row = [];
    var args = typeof(arguments[0]) == 'object' ? arguments[0] : arguments;
    
    for (var i=0; i<this.columns;++i) {
        if (i<args.length) row.push (args[i]);
        else row.push ("");
    }
    this.rows.push (row);
}

// ============================================================================
// FUNCTION TextTable.colorize
// ============================================================================
TextTable.colorize = function(str) {
    var matches = {
        "[.a-zA-Z_]+\\([._a-zA-Z0-9]*\\)":1,
        "[.a-zA-Z_]+\\[['\"._a-zA-Z0-9]*\\]":1,
        "(\\b(true|false))":36,
        "(\\b(null))":31,
        "\"[^\"]+\"":32
    }
    var x = str;
    for (var k in matches) {
        x = x.colorMatch (k, matches[k]);
    }
    return x;
}

// ============================================================================
// FUNCTION TextTable.auto
// ============================================================================
TextTable.auto = function (inputstr, cols) {
    var cutw = [];
    var cutp = [0];
    var pos = 0;
    var col = 1;
    var output = [];
    var lines = inputstr.split('\n');
    var nlines = lines.length;
    
    while ((!cols) || (col<cols)) {
        var isColumnStart = false;
        while (! isColumnStart) {
            while (inputstr[pos] != ' ' &&
                   inputstr[pos] != '\t' &&
                   inputstr[pos] != '\n') pos++;

            // Assume a single space means it's two words
            if (inputstr[pos]!='\n' && inputstr[pos+1]!=' ' &&
                inputstr[pos+1]!='\t') {
                pos++;
                continue;
            }
            while (inputstr[pos] == ' ' || inputstr[pos] == '\t') pos++;
            if (inputstr[pos] == '\n') break;
            
            isColumnStart = true;
            for (var i=1;i<nlines;i++) {
                if (lines[i].length < pos) continue;
                if (lines[i][pos-1]!=' ' && lines[i][pos-1]!='\t') {
                    isColumnStart = false;
                    break;
                }
            }
        }
        if (! isColumnStart) break;
        cutw[col-1] = pos - cutp[col-1];
        cutp[col] = pos;
        col++;
    }
    cutw[cols-1] = 0;
    if (! cols) {
        cols = col;
    }
    
    var t = new TextTable(cols);
    var outlines = [];
    var emptycount = 0;
    var nonemptyidx = -1;
    
    for (var li in lines) {
        if (lines[li] == "") break;
        for (var i=0; i<cols; ++i) {
            var cdata="";
            if (lines[li].length < cutp[i]) {
                cdata = " ";
            }
            else if (cutw[i]) {
                cdata = lines[li].substr(cutp[i], cutw[i]);
            }
            else cdata = lines[li].substr(cutp[i]);
            cdata = cdata.replace (/[ \t]*$/, "");
            
            if (i==0) {
                if (output.length) {
                    if (emptycount == (cols-1)) {
                        var l = outlines.length;
                        outlines[l-1][nonemptyidx] += " "+output[nonemptyidx];
                    }
                    else outlines.push (output);
                    emptycount = 0;
                    nonemptyidx = -1;
                }
                output = [];
            }

            if (cdata) nonemptyidx = i;
            else emptycount++;
            
            output[i] = cdata;
        }
    }
    if (output.length) outlines.push (output);
    for (var ol in outlines) t.addRow (outlines[ol]);
    return t;
}

// ============================================================================
// METHOD TextTable::format
// ============================================================================
TextTable::format = function() {
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
                    if (this._summarize) {
                        out[i] = [(""+this.rows[ri][i]).summarize(widths[i])];
                    }
                    else {
                        out[i] = [(""+this.rows[ri][i]).substr(0,widths[i])];
                    }
                }
                else {
                    var wrapped = (""+this.rows[ri][i]).rewrap(widths[i]);
                    wrapped = TextTable.colorize(wrapped);
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
                    addcol = ("").padEnd (w);
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

// ============================================================================
// DOCUMENTATION
// ============================================================================
#ifdef IS_INTERACTIVE
TextTable.help = function() {
    setapi.helptext({
        name:"t = new TextTable",
        args:[
            {name:"columns",text:"Number of columns in the table"}
        ],
        text:<<<`
            Utility class for making table-based layouts on a console
            screen. Once created, the following functions are available
            on the object:
        `>>>
    });
    
    echo ("");
    echo (TextTable.auto(<<<`
        t.stretchColumn(c)      Indicates which of the columns is the one that
                                should grow to the full screenwidth as needed.
                                Other columns will be sized to whatever is
                                needed to fit its cells. By default, this is
                                the last column.
        t.noWrap()              If text size in the stretchColumn exceeds the
                                screen width, instead of word-wrapping the cell,
                                any excess characters are cut off.
        t.summarize()           Uses string summarize on a noWrap cell.
        t.marginRight(m)        Decides the width of whitespace that should be
                                observed to the right of the table.
        t.boldColumn(c)         Sets a column in the table to be printed bold.
        t.colorColumn(c,col)    Sets up an ansi-color for the column. The
                                color value should be between 0 and 8.
        t.rightAlignColumn(c)   Sets a column up to be right-aligned.
        t.leftAlignColumn(c)    Sets a column back to being left-aligned.
        t.padding(p)            Sets the number of padding spaces that should
                                be between two columns (default 1).
        t.indent(i)             Sets the amount of indenting on the left
                                to be performed for the table.
        t.addRow(cell,cell,...) Adds a row to the dataset.
        t.format()              Renders the table and returns it as a text
                                string.
    `>>>, 2).indent(4).boldColumn(0).format());
    
    print (setapi.textformat(<<<`
        All methods except format() allow chaining.
    `>>>));
}

setapi (TextTable,"TextTable");
#endif

module.exports = TextTable;
