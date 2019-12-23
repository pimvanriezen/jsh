var setapi = require("setapi");

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
    var t = new texttable(3);
    t.addRow ("    ","write(data)","Overwrites matching files with data");
    t.addRow ("","run(...)","Executes the matching files, with arguments "+
                             "provided in the argument list.");
    t.addRow ("","count()","Returns the number of matching objects");
    t.addRow ("","each(func)","Calls func for every match with the file "+
                              "path as its argument");
    t.addRow ("","cat()","Concatenates contents of all matching files");
    t.addRow ("","line(nr)","Gets a specific line index of the concatenated "+
                            "data from matching files");
    t.addRow ("","chmod(spec)","Changes permissions on all matches");
    t.boldcolumn = 1;
    echo (t.format(sys.winsize()));    
}

module.exports = query;
