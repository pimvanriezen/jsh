var SQLite = function(dbname) {
    this.sqlid = sys.sql.open (dbname);
    if (! this.sqlid) throw new Error ("Could not open database");
}

SQLite::query = function() {
    if (! this.sqlid) throw new Error ("Database not open");
    var args = [this.sqlid].intern (Array::slice.call(arguments));
    return sys.sql.query.apply (null, args);
}

SQLite::close = function() {
    if (this.sqlid) sys.sql.close (this.sqlid);
    this.sqlid = 0;
}

SQLite::listTables = function() {
    return this.query ('SELECT name FROM sqlite_master WHERE type="table"');
}

SQLite::describe = function(table) {
    return this.query ("PRAGMA table_info("+table+")");
}

module.exports = SQLite;
