sys.appinfo = function() {
    var t = new texttable(5);
    t.boldColumn(0);
    t.marginRight(0);
    t.rightAlignColumn(1);
    t.rightAlignColumn(3);
    t.noWrap();
    for (var k in sys._modules) {
        var mod = sys._modules[k];
        if (mod.type=="app") {
            var vers;
            if (globalThis[k].app) vers = globalThis[k].app.version;
            if (! vers) vers = "n/a";
            t.addRow (k, humanSize(mod.size), mod.type, vers, mod.fileName);
        }
    }
    print (t.format (sys.winsize()));
}

sys.modinfo = function() {
    var t = new texttable(4);
    t.boldColumn(0);
    t.marginRight(0);
    t.rightAlignColumn(1);
    t.noWrap();
    for (var k in sys._modules) {
        var mod = sys._modules[k];
        if (mod.type!="app") {
            t.addRow (k, humanSize(mod.size), mod.type, mod.fileName);
        }
    }
    print (t.format (sys.winsize()));
}

sys.modinfo.help = function() {
    setapi.helptext ({
        name:"sys.modinfo",
        text:<<<
            Prints out the status of loaded and parsed javascript modules
            within the shell environment.
        >>>
    });
}
