var subProxy = {};
subProxy.has = function (target, key) {
    return target.data.hasOwnProperty (key);
}

subProxy.get = function (target, key) {
    if (typeof (target.data[key] == "object")) {
        return new Proxy({data:target.data[key],parent:target,id:key},subProxy);
    }
    return target.data[key];
}

subProxy.set = function (target, key, value) {
    console.log ("set "+key+" = "+value);
    target.data[key] = value;
    target.parent[target.id] = target.data;
}

var cProxy = {};
cProxy.has = function (target, key) {
    if (! target.loaded) {
        target.data = sys.read (target.fileName);
        target.loaded = true;
    }
    return target.data.hasOwnProperty (key);
}

cProxy.get = function (target, key) {
    if (! target.loaded) {
        target.data = load (target.fileName);
        target.loaded = true;
    }
    if (typeof (target.data[key]) == "object") {
        return new Proxy({data:target.data[key],parent:target,id:key},subProxy);
    }
    return target.data[key];
}

cProxy.set = function (target, key, value) {
    if (! target.loaded) {
        target.data = load (target.fileName);
        target.loaded = true;
    }
    target.data[key] = value;
    save (target.data, target.fileName);
}

module.exports = function(fname) {
    return new Proxy ({loaded:false,fileName:fname,data:{}}, cProxy);
}
