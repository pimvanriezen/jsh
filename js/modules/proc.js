var procproxy = {}
procproxy.get = function(target,pid) {
    if (pid == "self") return sys.ps({pid:sys.getpid()})[sys.getpid()];
    return sys.ps({pid:pid})[pid];
}

module.exports = new Proxy ({}, procproxy);
