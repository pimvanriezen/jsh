var File = require("file");

var Socket = function() {
    this.fd = null;
    this.rdbuf = "";
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
    this.eol = '\r\n';
}

Socket::connect = function(addr,port) {
    this.fd = sys.sock.tcp (""+addr, parseInt(port));
}

Socket::close = File::close;
Socket::read = File::read;
Socket::readLine = File::readLine;
Socket::write = File::write;
Socket::writeLine = File::writeLine;

module.exports = Socket;
