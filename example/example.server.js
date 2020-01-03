var globalStorage = {};
globalStorage.root = function(table) {
    var self = globalStorage;
    self.fn = table + ".jsdb";
    if (exists (self.fn)) {
        self.data = load (self.fn);
    }
    else self.data = {};
}
globalStorage.with = function(div,fn) {
    var self = globalStorage;
    var arg;
    if (self.data[div]) {
        arg = self.data[div];
    }
    var res = fn (arg);
    if (res !== undefined) {
        self.data[div] = res;
        save (self.data, self.fn);
    }
}

var handle = function (req) {
    req.setHeader ("X-Moose","meese");
    req.setHeader ("Content-type","application/json");
    var counter = 0;
    globalStorage.root ("default");
    globalStorage.with ("counter",function(c) {
        if (!c) c = 0;
        counter = c+1;
        return counter;
    });
        
    var res = {
        counter:counter,
        id:whoami(),
        system:sys.uname(),
        modules:sys.module.list(true),
        app:sys.app.list(true)
    }
    req.send (JSON.stringify (res));
    return 200;
}

request.setHandler (handle);
