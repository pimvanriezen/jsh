channel = function() {
    this.ch = sys.openchannel();
    Duktape.fin (this, function (x) {
        if (this.ch !== null) {
            sys.closechannel (this.ch);
            this.ch = null;
        }
    });
}

channel.prototype.send = function (data) {
    return sys.sendchannel (this.ch, JSON.stringify (data));
}

channel.prototype.recv = function() {
    var res = sys.recvchannel (this.ch);
    if (res === false) return null;
    else return JSON.parse (res);
}

channel.prototype.exit = function() {
    sys.exitchannel (this.ch);
}

go = function(chan, func) {
    return sys.go (chan.ch, func);
}
