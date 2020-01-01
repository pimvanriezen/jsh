var groupdbproxy = {}

groupdbproxy.get = function (target, key) {
    if ((key=="0")||(parseInt(key))) {
        return sys.getgrgid(parseInt(key));
    }
    return sys.getgrnam(key);
}

groupdbproxy.set = function () {
    throw ("Cannot change groupdb");
}

module.exports = new Proxy ({}, groupdbproxy);
