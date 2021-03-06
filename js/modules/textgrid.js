// ============================================================================
// CONSTRUCTOR TextGrid
// ============================================================================
var TextGrid = function() {
    this.data = [];
    this._indent = 0;
    this._minwidth = 4;
}

// ============================================================================
// METHOD TextGrid::add
// ============================================================================
TextGrid::add = function(obj) {
    this.data.push (""+obj);
    return this;
}

// ============================================================================
// METHOD TextGrid::minWidth
// ============================================================================
TextGrid::minWidth = function(w) {
    this._minwidth = w;
    return this;
}

// ============================================================================
// METHOD TextGrid::setData
// ============================================================================
TextGrid::setData = function(obj) {
    if (!obj) return;
    if (typeof(obj) != "object") return;
    if (obj.constructor != Array) return;
    this.data = obj;
    return this;
}

// ============================================================================
// METHOD TextGrid::indent
// ============================================================================
TextGrid::indent = function(i) {
    this._indent = parseInt(i);
    return this;
}

// ============================================================================
// METHOD TextGrid::format
// ============================================================================
TextGrid::format = function() {
    var arr = this.data;
    var indent = this._indent;
    var res = "";
    var maxsz = 0;
    for (var i in arr) {
        if (arr[i].length > maxsz) maxsz = arr[i].length;
    }
    if (maxsz < this._minwidth) maxsz = this._minwidth;
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

// ============================================================================
// DOCUMENTATION
// ============================================================================
#ifdef IS_INTERACTIVE
TextGrid.help = function() {
    setapi.helptext({
        name:"c = new TextGrid",
        text:<<<`
            Utility class for creating a grid-layout of bits of text
            that should fit the screen efficiently. Once constructed,
            the following functions are available on the object:
        `>>>
    });
    
    echo ("");
    echo (TextTable.auto(<<<`
        c.add(cell)         Adds a single text cell to the layout.
        c.setData(array)    Sets the full array of text nodes for the layout.
        c.indent(i)         Sets the indent level when displaying.
        c.minWidth(i)       The minimal width cells should get
        c.format()          Formats the layout and returns it as a string.
    `>>>, 2).indent(4).boldColumn(0).format());
    
    print (setapi.textformat(<<<`
        All methods except format() allow chaining.
    `>>>));
}

setapi (TextGrid,"TextGrid");
#endif

module.exports = TextGrid;
