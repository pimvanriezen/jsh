var Socket = require("socket");

var ListenSocket = function() {
    this.fd = null;
    this.unix = false;
}

ListenSocket::listenTo = function (arg1, arg2) {
    if (this.fd) {
        throw new Error ("Socket is already listening");
    }
    
    if (arg2) {
        this.fd = sys.sock.tcplisten (arg1, arg2);
        this.unix = false;
    }
    else {
        if (parseInt (arg1)) {
            this.fd = sys.sock.tcplisten (arg1);
            this.unix = false;
        }
        else {
            this.fd = sys.sock.unixlisten (arg1);
            this.unix = true;
        }
    }
    return (this.fd ? true : false);
}

ListenSocket::accept = function() {
    if (! this.fd) return null;
    var clientfd = sys.sock.accept (this.fd);
    if (! clientfd) return null;
    var res = new Socket();
    res.fd = clientfd;
    res.eol = (this.unix) ? '\n' : '\r\n';
    return res;
}

ListenSocket::close = function() {
    if (! this.fd) return;
    sys.io.close (this.fd);
    this.fd = null;
}

module.exports = ListenSocket;
