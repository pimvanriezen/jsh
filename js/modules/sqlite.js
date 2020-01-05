// ============================================================================
// CONSTRUCTOR
// ============================================================================
var SQLite = function(dbname) {
    this.sqlid = sys.sql.open (dbname);
    if (! this.sqlid) throw new Error ("Could not open database");
}

SQLite.help = function() {
    setapi.helptext({
        name:"db = new SQLite",
        args:[
            {name:"path",text:"Database path"}
        ],
        text:<<<`
            Creates an SQLite database object connected to a specified
            database file.
            
            Documented methods:
        `>>>
    });
    
    var list = [];
    for (var i in SQLite.prototype) {
        if (SQLite.prototype[i].help) list.push("SQLite::"+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (SQLite,"SQLite");

// ============================================================================
// METHOD SQLite::query
// ============================================================================
SQLite::query = function() {
    if (! this.sqlid) throw new Error ("Database not open");
    var args = [this.sqlid].intern (Array::slice.call(arguments));
    for (var i=1; i<args.length; ++i) {
        if (args[i] !== null && typeof(args[i]) == 'object') {
            args[i] = JSON.stringify (args[i]);
        }
    }
    return sys.sql.query.apply (null, args);
}

SQLite::query.help = function() {
    setapi.helptext({
        name:"db.query",
        args:[
            {name:"querytext",text:<<<`
                The SQL query text. The query is executed through a
                prepared statement, so any following arguments can
                be referred to in the query by using a question-
                mark. Objects added in arguments will be converted
                to JSON.
            `>>>}
        ],
        text:<<<`
            Performs a query. If the query returns data, the result is
            returned as an array of objects, with each object containing
            a dictionary of column values indexed by column name. If the
            query doesn't return data, but didn't generate an error,
            true is returned.
            
            Any SQL errors will throw an exception.
        `>>>
    });
}

// ============================================================================
// METHOD SQLite::close
// ============================================================================
SQLite::close = function() {
    if (this.sqlid) sys.sql.close (this.sqlid);
    this.sqlid = 0;
}

SQLite::close.help = function() {
    setapi.helptext({
        name:"db.close",
        text:<<<`
            Closes the connection. The database object is useless after
            this call.
        `>>>
    });
}

// ============================================================================
// METHOD SQLite::listTables
// ============================================================================
SQLite::listTables = function() {
    var dr = this.query ('SELECT name FROM sqlite_master WHERE type="table"');
    var res = [];
    for (var k in dr) {
        res.push (dr[k].name);
    }
    return res;
}

SQLite::listTables.help = function() {
    setapi.helptext({
        name:"db.listTables",
        text:<<<`
            Returns a list of tables in the database.
        `>>>
    });
}

// ============================================================================
// METHOD SQLite::describe
// ============================================================================
SQLite::describe = function(table) {
    return this.query ("PRAGMA table_info("+table+")");
}

SQLite::describe.help = function() {
    setapi.helptext({
        name:"db.describe",
        text:<<<`
            Returns a decsription of a specific table in the database.
        `>>>
    });
}

module.exports = SQLite;
