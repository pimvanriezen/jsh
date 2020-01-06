var Socket = require("socket");

// ============================================================================
// CONSTRUCTOR
// ============================================================================
var ListenSocket = function() {
    this.fd = null;
    this.unix = false;
}

#ifdef IS_INTERACTIVE
ListenSocket.help = function() {
    setapi.helptext({
        name:"ls = new ListenSocket",
        text:<<<`
            A class for setting up a socket-based server, that can listen
            on a TCP or Unix Domain address for incoming connnections.
            
            Documented functions/methods:
        `>>>
    });
    
    var list = [];
    for (var i in ListenSocket) {
        if (ListenSocket[i].help) list.push ("ListenSocket."+i);
    }
    for (var i in ListenSocket.prototype) {
        if (ListenSocket.prototype[i].help) list.push ("ListenSocket::"+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (ListenSocket,"ListenSocket");
#endif

// ============================================================================
// METHOD ListenSocket::listenTo
// ============================================================================
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

#ifdef IS_INTERACTIVE
ListenSocket::listenTo.help = function() {
    setapi.helptext ({
        name:"ls.listenTo",
        args:[
            {name:"spec",text:<<<`
                Either one or two arguments. If it is one, and the argument
                is a string, it is taken as the path for a unix domain
                socket to listen on. If it is a number, it is a port number
                that will be bound to INADDR_ANY.
                
                In case of two arguments, an IPv4/IPv6 address and a port
                number are expected.
            `>>>}
        ],
        text:<<<`
            Sets up the socket for listening to a specific port and/or
            address. Returns true if the socket is now listening, false
            otherwise.
        `>>>
    })
}
#endif

// ============================================================================
// METHOD ListenSocket::accept
// ============================================================================
ListenSocket::accept = function() {
    if (! this.fd) return null;
    var clientfd = sys.sock.accept (this.fd);
    if (! clientfd) return null;
    var res = new Socket();
    res.fd = clientfd;
    res.eol = (this.unix) ? '\n' : '\r\n';
    return res;
}

#ifdef IS_INTERACTIVE
ListenSocket::accept.help = function() {
    setapi.helptext ({
        name:"ls.accept",
        text:<<<`
            Waits for an incoming connection. Returns a socket for the new
            connection, or null if it failed.
        `>>>
    });
}
#endif

// ============================================================================
// METHOD ListenSocket::close
// ============================================================================
ListenSocket::close = function() {
    if (! this.fd) return;
    sys.io.close (this.fd);
    this.fd = null;
}

#ifdef IS_INTERACTIVE
ListenSocket::close.help = function() {
    setapi.helptext ({
        name:"ls.close",
        text:<<<`
            Closes a listening socket.
        `>>>
    });
}
#endif

module.exports = ListenSocket;
