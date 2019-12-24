var userdbproxy = {}

userdbproxy.get = function (target, key) {
    if ((key=="0")||(parseInt(key))) {
        return sys.getpwuid(parseInt(key));
    }
    return sys.getpwnam(key);
}

userdbproxy.set = function () {
    throw ("Cannot change userdb");
}

module.exports = new Proxy ({}, userdbproxy);
