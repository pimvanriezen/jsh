// ============================================================================
// Filesystem query implementation
// ============================================================================
function $fquery(q) {
    this.query = q;
}

$fquery.prototype.write = function(data) {
    var matches = sys.glob (this.query);
    for (var k in matches) {
        sys.write (data, matches[k]);
    }
}

$fquery.prototype.run = function() {
    var matches = sys.glob (this.query);
    var res = true;
    for (var k in matches) {
        sys.run (matches[k], arguments);
    } 
}

$fquery.prototype.count = function() {
    var matches = sys.glob (this.query);
    return matches.length;
}

$fquery.prototype.each = function(f) {
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        f (matches[i]);
    }
}

$fquery.prototype.line = function (i) {
    return this.cat().split('\n')[0];
}

$fquery.prototype.cat = function() {
    var res = "";
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        var data = sys.read (matches[i]);
        if (data) res += data;
    }
    return res;
}

module.exports = function(match) {
    return new $fquery(match);
}
