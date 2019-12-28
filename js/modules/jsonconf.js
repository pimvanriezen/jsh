var now = function() { return new Date; }
var cProxy = {};
cProxy.needReload = function (target) {
    if (now() - target.lastModified > 1000) {
        if (stat(target.fileName).mtime > target.lastModified) {
            return true;
        }
    }
    return false;
}
cProxy.has = function (target, key) {
    if (target.loaded) target.loaded = !cProxy.needReload(target);
    if (! target.loaded) {
        target.data = sys.read (target.fileName);
        target.loaded = true;
    }
    return target.data.hasOwnProperty (key);
}

cProxy.get = function (target, key) {
    if (target.loaded) target.loaded = !cProxy.needReload(target);
    if (! target.loaded) {
        target.data = load (target.fileName);
        target.loaded = true;
    }
    return target.data[key];
}

cProxy.set = function (target, key, value) {
    if (target.loaded) target.loaded = !cProxy.needReload(target);
    if (! target.loaded) {
        target.data = load (target.fileName);
        target.loaded = true;
    }
    target.data[key] = value;
    if (target.autosave) save (target.data, target.fileName);
}

module.exports = function(fname,doautosave) {
    var st = stat(fname);
    if (! st) {
        return null;
    }
    
    return new Proxy ({
        autosave:(doautosave?true:false),
        loaded:false,
        fileName:fname,
        lastModified:st.mtime,
        data:{}
    }, cProxy);
}
