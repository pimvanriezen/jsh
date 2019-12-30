var Socket = require("socket");

var ListenSocket = function() {
    this.fd = null;
}

ListenSocket::listenTo = function (arg1, arg2) {
    if (this.fd) {
        throw new Error ("Socket is already listening");
    }
    
    if (arg2) {
        this.fd = sys.sock.tcp_listen (arg1, arg2);
    }
    else {
        this.fd = sys.sock.tcp_listen (arg1);
    }
    return (this.fd ? true : false);
}

ListenSocket::accept = function() {
    if (! this.fd) return null;
    var clientfd = sys.sock.accept (this.fd);
    if (! clientfd) return null;
    var res = new Socket();
    res.fd = clientfd;
    return res;
}

ListenSocket::close = function() {
    if (! this.fd) return;
    sys.io.close (this.fd);
    this.fd = null;
}

module.exports = ListenSocket;
