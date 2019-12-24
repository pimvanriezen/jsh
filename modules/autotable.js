var autotable = function() {
    this.data = [];
    this._indent = 0;
}

autotable.prototype.add = function(obj) {
    this.data.push (""+obj);
}

autotable.prototype.setData = function(obj) {
    if (!obj) return;
    if (typeof(obj) != "object") return;
    if (obj.constructor != Array) return;
    this.data = obj;
}

autotable.prototype.indent = function(i) {
    this._indent = parseInt(i);
}

autotable.prototype.format = function() {
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

module.exports = autotable;
