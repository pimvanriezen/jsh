var GlobalStorage = function() {
    this._root = "default";
    this.ACCESS_LOCKED = true;
}

GlobalStorage::root = function(table) {
    this._root = table;
}

GlobalStorage::with = function(div,fn,locked) {
    if (! locked) locked = false;
    var root = this._root;
    var dt = sys.global.get (root, div, locked);
    var res = null;
    try {
        if (dt) dt = JSON.parse (dt);
        res = fn(dt);
        if (res === undefined) res = dt;
        else res = JSON.stringify(res);
    }
    catch (e) {
        if (res === null) res = "";
    }
    sys.global.set (root, div, res);
}

GlobalStorage::withLocked = function(div,fn) {
    this.with (div,fn,true);
}

GlobalStorage::initialize = function (data) {
    var needsinit = false;
    this._root = "default"
    this.withLocked ("__internal__",function(x) {
        if (x === null) {
            for (var ri in data) {
                for (var i in data[ri]) {
                    var obj = data[ri][i];
                    if (typeof (obj) != "string") obj = JSON.stringify(obj);
                    sys.global.set (ri,i,obj);
                }
            }
            return {initialized:true};
        }
        return x;
    });
}

module.exports = new GlobalStorage();
