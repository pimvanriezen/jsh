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
    var t = texttable.auto(<<<
        c.send(data)     Sends data to the channel, returns false if
                         the channel is empty (except for us). Data sent
                         is serialized as JSON, so you shouldn't have
                         to worry about the type.
        c.recv()         Receives data from the channel, also returns
                         false if the channel is empty.
        c.exit()         Tells any other parties on the channel that this
                         process will stop using it.
    >>>, 2);
    t.indent (4);
    t.boldColumn(0);
    print (t.format());
}

setapi (channel, "channel");

channel.prototype.send = function (data) {
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    return sys.channel.send (this.ch, JSON.stringify (data));
}

channel.prototype.senderror = function (data) {
    sys.channel.senderror (this.ch, ""+data);
}

channel.prototype.recv = function() {
    if (sys.channel.error (this.ch)) {
        printerr ("Channel error: "+sys.channel.error (this.ch));
    }
    var res = sys.channel.recv (this.ch);
    if (res === false) return null;
    else return JSON.parse (res);
}

channel.prototype.exit = function() {
    sys.channel.exit (this.ch);
}

go = function(chan, func) {
    return sys.go (chan.ch, function() {
        try {
            var res = func(chan);
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
                The function to spawn. This function gets no arguments, but
                its return value, if it has one, will be sent to the
                channel. If you want to more explicitly deal with the
                channel from inside the coroutine, pass it to the
                function by using a closure for this argument.
            >>>}
        ],
        text:<<<
            Spawns a coroutine, running in its own address space but within
            the same javascript context we already have. The code run
            inside the routine has no access to the console, or any of the
            currently open files. It can, however, use the channel to
            communicate with the parent process.
        >>>
    })
}

setapi (go, "go");
