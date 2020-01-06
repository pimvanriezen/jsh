sys.module = {}

// ============================================================================
// FUNCTION sys.module.list
// ============================================================================
sys.module.list = function(asJSON) {
    var t = new TextTable(4);
    t.boldColumn(0);
    t.marginRight(0);
    t.rightAlignColumn(1);
    t.noWrap();
    t.summarize();
    var rows = [].intern(sys._modules);
    rows.sort (function(a,b) { 
        if (a.type == "bootstrap" && b.type != "bootstrap") return -1;
        if (a.type != "bootstrap" && b.type == "bootstrap") return 1;
        if (a.loadtime > b.loadtime) return 1;
        if (a.loadtime < b.loadtime) return -1;
        return 0;
    });
    
    if (asJSON) {
        var res = [];
        for (var k in rows) {
            if (rows[k].type != "app") res.push (rows[k]);
        }
        return res;
    }
    
    for (var k in rows) {
        var mod = rows[k];
        if (mod.type!="app") {
            t.addRow (
                mod.id,
                mod.size.toSize(),
                mod.type,
                mod.fileName
            );
        }
    }
    print (t.format (sys.winsize()));
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
#ifdef IS_INTERACTIVE
sys.module.list.help = function() {
    setapi.helptext ({
        name:"sys.module.list",
        text:<<<`
            Prints out the status of loaded and parsed javascript modules
            within the shell environment.
        `>>>
    });
}

setapi (sys.module.list, "sys.module.list");
#endif
