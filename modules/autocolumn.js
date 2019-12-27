var AutoColumn = function() {
    this.data = [];
    this._indent = 0;
}

AutoColumn.prototype.add = function(obj) {
    this.data.push (""+obj);
    return this;
}

AutoColumn.prototype.setData = function(obj) {
    if (!obj) return;
    if (typeof(obj) != "object") return;
    if (obj.constructor != Array) return;
    this.data = obj;
    return this;
}

AutoColumn.prototype.indent = function(i) {
    this._indent = parseInt(i);
    return this;
}

AutoColumn.prototype.format = function() {
    var arr = this.data;
    var indent = this._indent;
    var res = "";
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

AutoColumn.help = function() {
    setapi.helptext({
        name:"c = new AutoColumn",
        text:<<<
            Utility class for creating a grid-layout of bits of text
            that should fit the screen efficiently. Once constructed,
            the following functions are available on the object:
        >>>
    });
    
    echo ("");
    echo (TextTable.auto(<<<
        c.add(cell)         Adds a single text cell to the layout.
        c.setData(array)    Sets the full array of text nodes for the layout.
        c.indent(i)         Sets the indent level when displaying.
        c.format()          Formats the layout and returns it as a string.
    >>>, 2).indent(4).boldColumn(0).format());
    
    print (setapi.textformat(<<<
        All methods except format() allow chaining.
    >>>));
}

setapi (AutoColumn,"AutoColumn");

module.exports = AutoColumn;
