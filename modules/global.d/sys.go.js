Channel = function() {
    this.ch = sys.Channel.open();
    Duktape.fin (this, function (x) {
        if (this.ch !== null) {
            sys.Channel.close (this.ch);
            this.ch = null;
        }
    });
}

Channel.help = function() {
    setapi.helptext({
        name:"c = new Channel",
        text:<<<
            Create a Channel object to communicate with co-routines.
            The returned object has the following functions available:
        >>>
    });
    echo("");
    print (TextTable.auto(<<<
        c.send(data)     Sends data to the Channel, returns false if
                         the Channel is empty (except for us). Data sent
                         is serialized as JSON, so you shouldn't have
                         to worry about the type.
        c.recv()         Receives data from the Channel, returns null
                         if the Channel is empty. Received data
                         is always deserialized back from JSON, and
                         should end up with the original type.
        c.senderror(txt) From a coroutine, set Channel to an error state.
        c.error()        Returns error string, or false if the Channel
                         had no errors.
        c.isempty()      Returns true if there are no listeners left on
                         the Channel.
        c.exit()         Tells any other parties on the Channel that this
                         process will stop using it.
        c.close()        Completely closes the Channel. If there were still
                         active coroutines spawned from it, they will be
                         killed.
    >>>, 2).indent(4).boldColumn(0).format());
}

setapi (Channel, "Channel");

Channel.prototype.send = function (data) {
    if (this.ch === null) return false;
    if (sys.Channel.error (this.ch)) {
        printerr ("Channel error: "+sys.Channel.error (this.ch));
    }
    return sys.Channel.send (this.ch, JSON.stringify (data));
}

Channel.prototype.senderror = function (data) {
    if (this.ch === null) return;
    sys.Channel.senderror (this.ch, ""+data);
}

Channel.prototype.isempty = function (data) {
    if (this.ch === null) return true;
    return sys.Channel.isempty (this.ch);
}

Channel.prototype.recv = function() {
    if (this.ch === null) return null;
    if (sys.Channel.error (this.ch)) {
        printerr ("Channel error: "+sys.Channel.error (this.ch));
    }
    var res = sys.Channel.recv (this.ch);
    if (res === false) return null;
    else return JSON.parse (res);
}

Channel.prototype.exit = function() {
    if (this.ch === null) return;
    sys.Channel.exit (this.ch);
}

Channel.prototype.close = function() {
    if (this.ch === null) return;
    sys.Channel.close (this.ch);
}

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

go.help = function() {
    setapi.helptext({
        name:"go",
        args:[
            {name:"Channel",text:<<<
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
