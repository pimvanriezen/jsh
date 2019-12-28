sys.module = {}

// ============================================================================
// FUNCTION sys.module.list
// ============================================================================
sys.module.list = function() {
    var t = new TextTable(4);
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

// ============================================================================
// DOCUMENTATION
// ============================================================================
sys.module.list.help = function() {
    setapi.helptext ({
        name:"sys.module.list",
        text:<<<
            Prints out the status of loaded and parsed javascript modules
            within the shell environment.
        >>>
    });
}

setapi (sys.module.list, "sys.module.list");
