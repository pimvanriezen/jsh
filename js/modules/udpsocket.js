// ============================================================================
// CONSTRUCTOR
// ============================================================================
var UDPSocket = function() {
    this.fd = sys.sock.udp();
    this.enc = new TextEncoder();
    this.dec =  new TextDecoder();
}

UDPSocket.help = function() {
    setapi.helptext({
        name:"us = new UDPSocket",
        text:<<<`
            Creats a socket for sending (and optionally receiving)
            UDP packets and decoding them into strings.
        `>>>
    });
}

setapi (UDPSocket,"UDPSocket");

// ============================================================================
// METHOD UDPSocket::bind
// ============================================================================
UDPSocket::bind = function (arg1, arg2) {
    if (! arg2) return sys.sock.udpbind (this.fd, arg1);
    return sys.sock.udpbind (this.fd, arg1, arg2);
}

// ============================================================================
// METHOD UDPSocket::send
// ============================================================================
UDPSocket::send = function (addr, port, msg) {
    var encmsg = this.enc.encode (msg);
    return sys.sock.send (this.fd, addr, port, encmsg);
}

// ============================================================================
// METHOD UDPSocket::receiveMessage
// ============================================================================
UDPSocket::receiveMessage = function(timeout_ms) {
    if (timeout_ms) {
        if (sys.io.select (this.fd,null,null,timeout_ms)[0].length == 0) {
            return null;
        }
    }
    var res = sys.sock.recv (this.fd);
    if (! res) return null;
    res.data = this.dec.decode(res.data);
    return res;
}

// ============================================================================
// METHOD UDPSocket::receive
// ============================================================================
UDPSocket::receive = function(timeout_ms) {
    var res = this.receiveMessage (timeout_ms);
    if (! res) return null;
    return res.data;
}

module.exports = UDPSocket;
