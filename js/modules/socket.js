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

Socket.help = function() {
    setapi.helptext({
        name:"f = new Socket",
        text:<<<`
            Class for handling tcp-based connections. Shares code and
            functionality with the File class, except for the parts
            where a connection is set up.
            
            Available functions on constructed objects:
        `>>>
    });
    
    var list = [];
    for (var i in Socket) {
        if (Socket[i].help) list.push("Socket."+i);
    }

    print (new TextGrid().setData(list).indent(4).format());
}

setapi (Socket, "Socket");

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

Socket.connect = {help:function() {
    setapi.helptext ({
        name:"f.connect",
        args:[
            {name:"spec",text:<<<`
                Either one or two arguments. If there are two, they are
                taken to be an ip address and port number. If there's one,
                it is understood to be the path to a unix domain socket.
                
                IP addresses can be either IPv4 or IPv6.
            `>>>}
        ],
        text:<<<`
            Connect to a remote host or unix domain socket. Returns true on
            success, false on failure.
        `>>>
    });
}}

setapi (Socket.connect, "Socket.connect");

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

Socket.close = File.close;
Socket.canRead = File.canRead;
Socket.canWrite = File.canWrite;
Socket.read = File.read;
Socket.readLine = File.readLine;
Socket.write = File.write;
Socket.writeLine = File.writeLine;

module.exports = Socket;
