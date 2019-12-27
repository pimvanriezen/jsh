channel = function() {
    this.ch = sys.channel.open();
    Duktape.fin (this, function (x) {
        if (this.ch !== null) {
            sys.channel.close (this.ch);
            this.ch = null;
        }
    });
}

channel.help = function() {
    setapi.helptext({
        name:"c = new channel",
        text:<<<
            Create a channel object to communicate with co-routines.
            The returned object has the following functions available:
        >>>
    });
    echo("");
    print (texttable.auto(<<<
        c.send(data)     Sends data to the channel, returns false if
                         the channel is empty (except for us). Data sent
                         is serialized as JSON, so you shouldn't have
                         to worry about the type.
        c.recv()         Receives data from the channel, returns null
                         if the channel is empty. Received data
                         is always deserialized back from JSON, and
                         should end up with the original type.
        c.senderror(txt) From a coroutine, set channel to an error state.
        c.error()        Returns error string, or false if the channel
                         had no errors.
        c.isempty()      Returns true if there are no listeners left on
                         the channel.
        c.exit()         Tells any other parties on the channel that this
                         process will stop using it.
    >>>, 2).indent(4).boldColumn(0).format());
}

setapi (channel, "channel");

channel.prototype.send = function (data) {
    if (this.ch === null) return false;
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    return sys.channel.send (this.ch, JSON.stringify (data));
}

channel.prototype.senderror = function (data) {
    if (this.ch === null) return;
    sys.channel.senderror (this.ch, ""+data);
}

channel.prototype.isempty = function (data) {
    if (this.ch === null) return true;
    return sys.channel.isempty (this.ch);
}

channel.prototype.recv = function() {
    if (this.ch === null) return null;
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    var res = sys.channel.recv (this.ch);
    if (res === false) return null;
    else return JSON.parse (res);
}

channel.prototype.exit = function() {
    if (this.ch === null) return;
    sys.channel.exit (this.ch);
}

channel.prototype.close = function() {
    if (this.ch === null) return;
    sys.channel.close (this.ch);
}

go = function(chan, func) {
    var argv = [chan];
    for (var i=2; i<arguments.length; ++i) {
        argv.push (arguments[i]);
    }
    return sys.go (chan.ch, function() {
        try {
            var res = func.apply("channel",argv);
            if (res !== undefined) {
                chan.send (res);
            }
        }
        catch (e) {
            chan.senderror (e);
        }
    });
}

go.help = function() {
    setapi.helptext({
        name:"go",
        args:[
            {name:"channel",text:<<<
                A created channel object that will be used for communicating
                with the coroutine.
            >>>},
            {name:"func",text:<<<
                The function to spawn. The function will always get, as its
                first argument, a reference to the channel object. Any
                extra arguments after the function passed to go() will
                be passed to the function as well (after the channel).
            >>>}
        ],
        text:<<<
            Spawns a coroutine, running in its own address space but within
            the same javascript context we already have. The code run
            inside the routine has no access to the console, or any of the
            currently open files. It can, however, use the channel to
            communicate with the parent process.
            
            See help(channel) for information on how to interact with a
            channel.
        >>>
    })
}

setapi (go, "go");
