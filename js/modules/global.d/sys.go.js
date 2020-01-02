// ============================================================================
// CONSTRUCTOR
// ============================================================================
Channel = function() {
    this.ch = sys.channel.open();
    Duktape.fin (this, function (x) {
        if (this.ch !== null) {
            sys.channel.close (this.ch);
            this.ch = null;
        }
    });
}

Channel.help = function() {
    setapi.helptext({
        name:"c = new Channel",
        text:<<<`
            A class for communicating with coroutines. Read help(go) for
            information about spawning coroutines.
            
            Documented methods:
        `>>>
    });
    
    var list = [];
    for (var i in Channel.prototype) {
        if (Channel.prototype[i].help) list.push ("Channel::"+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (Channel, "Channel");

// ============================================================================
// METHOD Channel::send
// ============================================================================
Channel::send = function (data) {
    if (this.ch === null) return false;
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    return sys.channel.send (this.ch, JSON.stringify (data));
}

Channel::send.help = function() {
    setapi.helptext({
        name:"c.send",
        args:[
            {name:"data",text:"The object/primitive to send"}
        ],
        text:<<<`
            From a calling perspective, this sends the message to
            the first available coroutine listening on this channel.
            From a coroutine perspective, this sends the message to
            the caller.
        `>>>
    })
}

// ============================================================================
// METHOD Channel::senderror
// ============================================================================
Channel::senderror = function (data) {
    if (this.ch === null) return;
    sys.channel.senderror (this.ch, ""+data);
}

Channel::senderror.help = function() {
    setapi.helptext({
        name:"c.senderror",
        args:[
            {name:"error",text:"An error string"}
        ],
        text:<<<`
            Allows a coroutine to push an error to the caller.
        `>>>
    })
}

// ============================================================================
// METHOD Channel::isempty
// ============================================================================
Channel::isempty = function() {
    if (this.ch === null) return true;
    return sys.channel.isempty (this.ch);
}

Channel::isempty.help = function() {
    setapi.helptext({
        name:"c.isempty",
        text:<<<`
            Returns true if there are no other parties on this channel.
        `>>>
    })
}

Channel::available = function() {
    return sys.channel.available (this.ch);
}

// ============================================================================
// METHOD Channel::recv
// ============================================================================
Channel::recv = function() {
    if (this.ch === null) return null;
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    var res = sys.channel.recv (this.ch);
    if (res === false) return null;
    else return JSON.parse (res);
}

Channel::recv.help = function() {
    setapi.helptext({
        name:"c.recv",
        text:<<<`
            Waits for, then returns, a message on the channel.
        `>>>
    })
}

// ============================================================================
// METHOD Channel::exit
// ============================================================================
Channel::exit = function() {
    if (this.ch === null) return;
    sys.channel.exit (this.ch);
}

Channel::exit.help = function() {
    setapi.helptext({
        name:"c.exit",
        text:<<<`
            Communicates the intention to close the channel and send no
            further messages. Most useful for the caller, to tell
            Worker coroutines that they can exit.
        `>>>
    })
}

// ============================================================================
// METHOD Channel::close
// ============================================================================
Channel::close = function() {
    if (this.ch === null) return;
    sys.channel.close (this.ch);
}

Channel::close.help = function() {
    setapi.helptext({
        name:"c.close",
        text:<<<`
            Closes the channel completely. Still running coroutines will
            be slaughtered like younglings.
        `>>>
    })
}

// ============================================================================
// FUNCTION go
// ============================================================================
go = function(chan, func) {
    var argv = [chan];
    for (var i=2; i<arguments.length; ++i) {
        argv.push (arguments[i]);
    }
    return sys.go (chan.ch, function() {
        try {
            var res = func.apply("Channel",argv);
            if (res !== undefined) {
                chan.send (res);
            }
        }
        catch (e) {
            chan.senderror (e);
        }
    });
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
go.help = function() {
    setapi.helptext({
        name:"go",
        args:[
            {name:"channel",text:<<<`
                A created Channel object that will be used for communicating
                with the coroutine.
            `>>>},
            {name:"func",text:<<<`
                The function to spawn. The function will always get, as its
                first argument, a reference to the Channel object. Any
                extra arguments after the function passed to go() will
                be passed to the function as well (after the Channel).
            `>>>}
        ],
        text:<<<`
            Spawns a coroutine, running in its own address space but within
            the same javascript context we already have. The code run
            inside the routine has no access to the console, or any of the
            currently open files. It can, however, use the Channel to
            communicate with the parent process.
            
            See help(Channel) for information on how to interact with a
            Channel.
        `>>>
    })
}

setapi (go, "go");
