sys.modinfo = function() {
    var t = new texttable(4);
    t.boldColumn(0);
    t.marginRight(0);
    t.rightAlignColumn(1);
    t.noWrap();
    for (var k in sys._modules) {
        var mod = sys._modules[k];
        t.addRow (k, humanSize(mod.size), mod.type, mod.fileName);
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
