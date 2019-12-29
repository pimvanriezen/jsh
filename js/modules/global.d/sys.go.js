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

// ============================================================================
// METHOD Channel::senderror
// ============================================================================
Channel::senderror = function (data) {
    if (this.ch === null) return;
    sys.channel.senderror (this.ch, ""+data);
}

// ============================================================================
// METHOD Channel::isempty
// ============================================================================
Channel::isempty = function (data) {
    if (this.ch === null) return true;
    return sys.channel.isempty (this.ch);
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

// ============================================================================
// METHOD Channel::exit
// ============================================================================
Channel::exit = function() {
    if (this.ch === null) return;
    sys.channel.exit (this.ch);
}

// ============================================================================
// METHOD Channel::close
// ============================================================================
Channel::close = function() {
    if (this.ch === null) return;
    sys.channel.close (this.ch);
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
Channel.help = function() {
    setapi.helptext({
        name:"c = new Channel",
        text:<<<
            Create a Channel object to communicate with co-routines.
            The returned object has the following functions available:
        >>>
    });
    echo("");
    echo (TextTable.auto(<<<
        c.send(data)     Sends data to the channel, returns false if
                         the channel is empty (except for us). Data sent
                         is serialized as JSON, so you shouldn't have
                         to worry about the type.
        c.recv()         Receives data from the channel, returns null
                         if the Channel is empty. Received data
                         is always deserialized back from JSON, and
                         should end up with the original type.
        c.senderror(txt) From a coroutine, set channel to an error state.
        c.error()        Returns error string, or false if the channel
                         had no errors.
        c.isempty()      Returns true if there are no listeners left on
                         the channel.
        c.exit()         Tells any other parties on the channel that this
                         process will stop using it.
        c.close()        Completely closes the channel. If there were still
                         active coroutines spawned from it, they will be
                         killed.
    >>>, 2).indent(4).boldColumn(0).format());
    print (setapi.textformat(<<<
        See help(go) for information on how to spawn a coroutine that can
        communicate through the channel.
    >>>));
}

setapi (Channel, "Channel");

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
            {name:"channel",text:<<<
                A created Channel object that will be used for communicating
                with the coroutine.
            >>>},
            {name:"func",text:<<<
                The function to spawn. The function will always get, as its
                first argument, a reference to the Channel object. Any
                extra arguments after the function passed to go() will
                be passed to the function as well (after the Channel).
            >>>}
        ],
        text:<<<
            Spawns a coroutine, running in its own address space but within
            the same javascript context we already have. The code run
            inside the routine has no access to the console, or any of the
            currently open files. It can, however, use the Channel to
            communicate with the parent process.
            
            See help(Channel) for information on how to interact with a
            Channel.
        >>>
    })
}

setapi (go, "go");
