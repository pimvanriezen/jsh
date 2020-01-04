var lnfunc = function(obj) {
    if (! obj) return 0;
    if (typeof(obj) == "string") return obj.length;
    if (typeof(obj) == "object") {
        if (obj.length) return obj.length;
        return Object.keys(obj).length;
    }
    return (""+obj).length;
}

module.exports = lnfunc;
