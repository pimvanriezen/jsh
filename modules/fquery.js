// ============================================================================
// Filesystem query implementation
// ============================================================================
var fquery = function(q) {
    this.query = q;
}

fquery.prototype.write = function(data) {
    var matches = sys.glob (this.query);
    for (var k in matches) {
        sys.write (data, matches[k]);
    }
}

fquery.prototype.run = function() {
    var matches = sys.glob (this.query);
    var res = true;
    for (var k in matches) {
        sys.run (matches[k], arguments);
    } 
}

fquery.prototype.count = function() {
    var matches = sys.glob (this.query);
    return matches.length;
}

fquery.prototype.each = function(f) {
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        f (matches[i]);
    }
}

fquery.prototype.line = function (i) {
    return this.cat().split('\n')[i];
}

fquery.prototype.chmod = function (mode) {
    var matches = sys.glob (this.query);
    for (var k in matches) {
        chmod (matches[k], mode);
    }
}    

fquery.prototype.cat = function() {
    var res = "";
    var matches = sys.glob (this.query);
    for (var i=0; i<matches.length; ++i) {
        var data = sys.read (matches[i]);
        if (data) res += data;
    }
    return res;
}

var query = function(match) {
    return new fquery(match);
}

query.help = function() {
    setapi.helptext ({
        name:"$",
        args:[
            {name:"wildcard",text:"Filesystem wildcard match"}
        ],
        text:<<<
            Sets up a wildcard query against paths on the filesystem.
            The returned object has a couple of functions to deal with
            actually processing the query results, which are evaluated
            just before a function is called.
            
            The following functions are supported:
        >>>
    });
    echo ("");
    echo (texttable.auto (<<<
        write(data)     Overwrites matching objects with data
        run(...)        Executes the matching files, with arguments provided
                        in the argument list
        count()         Returns the number of matching objects
        each(func)      Calls func(match) on each matching object
        cat()           Concatenates contents of all matching files
        line(nr)        Returns a numbered line from the concatenated
                        contents of all matching files
        chmod(spec)     Changes permissions on all matching objects. See the
                        help page of the chmod() command for the valid 
                        specification
    >>>,2).boldColumn(0).indent(4).format());
}

module.exports = query;
