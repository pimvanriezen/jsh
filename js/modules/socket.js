var File = require("file");

// ============================================================================
// CONSTRUCTOR
// ============================================================================
var Socket = function() {
    this.fd = null;
    this.rdbuf = "";
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
    this.eol = '\r\n';
}

#ifdef IS_INTERACTIVE
Socket.help = function() {
    setapi.helptext({
        name:"f = new Socket",
        text:<<<`
            Class for handling tcp-based connections. Shares code and
            functionality with the File class, except for the parts
            where a connection is set up.
            
            Documented functions/methods::
        `>>>
    });
    
    var list = [];
    for (var i in Socket) {
        if (Socket[i].help) list.push("Socket."+i);
    }
    for (var i in Socket.prototype) {
        if (Socket.prototype[i].help) list.push("Socket::"+i);
    }

    print (new TextGrid().setData(list).indent(4).format());
}

setapi (Socket,"Socket");
#endif

// ============================================================================
// FUNCTION Socket.resolve
// ============================================================================
Socket.resolve = function(name) {
    if (name.match (/^::ffff:[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) return name;
    if (name.match (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/)) return name;
    if (name.match (/^[0-9a-fA-F:]+:[0-9a-fA-F]+$/)) return name;
    
    var res = sys.gethostbyname (name);
    return res[0];
}

#ifdef IS_INTERACTIVE
Socket.resolve.help = function() {
    setapi.helptext ({
        name:"Socket.resolve",
        args:[
            {name:"hostname",text:"Hostname to resolve"}
        ],
        text:<<<`
            Resolves the hostname to the first convenient IP address
            returned by the system resolver.
        `>>>
    });
}
#endif

// ============================================================================
// METHOD Socket::connect
// ============================================================================
Socket::connect = function(addr,port) {
    addr = Socket.resolve (addr);
    if (! port) {
        this.fd = sys.sock.unix (addr);
        this.eol = '\n';
    }
    else {
        this.fd = sys.sock.tcp (""+addr, parseInt(port));
    }
}

#ifdef IS_INTERACTIVE
Socket::connect.help = function() {
    setapi.helptext ({
        name:"f.connect",
        args:[
            {name:"spec",text:<<<`
                Either one or two arguments. If there are two, they are
                taken to be a host address and port number. If there's one,
                it is understood to be the path to a unix domain socket.
                
                The address can be either a hostname that can be resolved,
                or an IPv4 or IPv6 literal.
            `>>>}
        ],
        text:<<<`
            Connect to a remote host or unix domain socket. Returns true on
            success, false on failure.
        `>>>
    });
}
#endif

// ============================================================================
// Inherit functions from File
// ============================================================================
Socket::close = File::close;
Socket::canRead = File::canRead;
Socket::canWrite = File::canWrite;
Socket::read = File::read;
Socket::readLine = File::readLine;
Socket::write = File::write;
Socket::writeLine = File::writeLine;

module.exports = Socket;
