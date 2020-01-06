var Socket = require("socket");

// ============================================================================
// CONSTRUCTOR
// ============================================================================
var UDPSocket = function() {
    this.fd = sys.sock.udp();
    this.enc = new TextEncoder();
    this.dec =  new TextDecoder();
}

#ifdef IS_INTERACTIVE
UDPSocket.help = function() {
    setapi.helptext({
        name:"us = new UDPSocket",
        text:<<<`
            Creats a socket for sending (and optionally receiving)
            UDP packets and decoding them into strings.
            
            Documented functions/methods:
        `>>>
    });
    
    var list = [];
    for (var i in UDPSocket) {
        if (UDPSocket[i].help) list.push ("UDPSocket."+i);
    }
    for (var i in UDPSocket.prototype) {
        if (UDPSocket.prototype[i].help) list.push ("UDPSocket::"+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (UDPSocket,"UDPSocket");
#endif

// ============================================================================
// METHOD UDPSocket::bind
// ============================================================================
UDPSocket::bind = function (arg1, arg2) {
    if (! arg2) return sys.sock.udpbind (this.fd, arg1);
    return sys.sock.udpbind (this.fd, arg1, arg2);
}

#ifdef IS_INTERACTIVE
UDPSocket::bind.help = function() {
    setapi.helptext ({
        name:"us.bind",
        args:[
            {name:"address",text:"[Optional] address to bind to"},
            {name:"port",text:"Port to bind to"}
        ],
        text:<<<`
            Binds the socket to a specific port, and optionally address.
            Returns true if the binding was successful.
        `>>>
    });
}
#endif

// ============================================================================
// METHOD UDPSocket::send
// ============================================================================
UDPSocket::send = function (addr, port, msg) {
    addr = Socket.resolve (addr);

    var encmsg = this.enc.encode (msg);
    return sys.sock.send (this.fd, addr, port, encmsg);
}

#ifdef IS_INTERACTIVE
UDPSocket::send.help = function() {
    setapi.helptext ({
        name:"us.send",
        args:[
            {name:"host",text:"Hostname or address to send to"},
            {name:"port",text:"Port number"},
            {name:"msg",text:"String to send"}
        ],
        text:<<<`
            Sends a UDP packet to a remote host.
        `>>>
    });
}
#endif

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

#ifdef IS_INTERACTIVE
UDPSocket::receiveMessage.help = function() {
    setapi.helptext ({
        name:"us.receiveMessage",
        text:<<<`
            Waits for an incoming message, then returns an object
            with the properties "data" (a string with the received
            message), "from" (an IPv4 or IPv6 address string), and
            "port" (a UDP port number).
        `>>>
    });
}
#endif

// ============================================================================
// METHOD UDPSocket::receive
// ============================================================================
UDPSocket::receive = function(timeout_ms) {
    var res = this.receiveMessage (timeout_ms);
    if (! res) return null;
    return res.data;
}

#ifdef IS_INTERACTIVE
UDPSocket::receive.help = function() {
    setapi.helptext ({
        name:"us.receive",
        text:<<<`
            Waits for an incoming message, then returns only its
            data as a string.
        `>>>
    })
}
#endif

module.exports = UDPSocket;
