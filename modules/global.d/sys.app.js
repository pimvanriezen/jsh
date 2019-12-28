sys.app = {}

// ============================================================================
// FUNCTION sys.app.load
// ---------------------
// Loads a file like a module, and parses its exports into the global
// namespace. 
// ============================================================================
sys.app.load = function(appname, apppath) {
    var src = sys.read (apppath);
    var module = {
        name:appname,
    }
    
    var pre = <<<
        (function(){
            return function(module) {
    >>>;
    
    var post = "}})()";
    var wrapped = pre + src + post;
    try {
        sys.eval (wrapped, apppath)(module);
        if (globalThis[appname] !== undefined) {
            var old = globalThis[appname];
            if (old.app) {
                if (old.app.version != module.version) {
                    printerr ("Upgrading "+appname+" to "+module.version);
                    delete globalThis[appname];
                    module.override = true;
                }
                else return; // Same version, not an error.
            }
        }
        if (module.override || globalThis[appname] === undefined) {
            if (module.exports) {
                globalThis[appname] = module.exports;
                globalThis[appname].app = {path:apppath};
                if (module.version) {
                    globalThis[appname].app.version = module.version;
                }
                if (module.exports.help) {
                    setapi (module.exports, appname);
                    for (var k in module.exports) {
                        if (k=="help") continue;
                        if (module.exports[k].help) {
                            setapi (module.exports[k], appname+"."+k);
                        }
                    }
                }
            }
            else {
                return;
            }
        }
        else {
            printerr ("Could not load "+appname+": Symbol exists");
            return false;
        }
    }
    catch (e) {
        printerr ("Error loading shell app '"+appname+"': "+e.message);
        return false;
    }
    
    sys._modules[appname] = {
        fileName:apppath,
        size:src.length,
        type:"app",
        loadtime:new Date()
    }
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
sys.app.load.help = function() {
    setapi.helptext ({
        name:"sys.app.load",
        args:[
            {name:"appname",text:<<<
                Application name as it will appear in the global scope,
                e.g. "nukelichtenstein"
            >>>},
            {name:"path",text:"Path of the application's js source"}
        ],
        text:<<<
            Loads in a shell application.
        >>>
    });
}

// ============================================================================
// FUNCTION sys.app.scan
// ============================================================================
sys.app.scan = function() {
    for (var i in env.JSH_APP_PATH) {
        var glob = env.JSH_APP_PATH[i] + "/*.app.js";
        $(glob).each (function (match) {
            var appname = match.substr(0,match.length - ".app.js".length);
            var appname = appname.replace (/.*\//, "");
            sys.app.load (appname, match);
        });
    }
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
sys.app.scan.help = function() {
    setapi.helptext ({
        name:"sys.app.scan",
        text:<<<
            Scans all jsh module paths for new or updated shell applications
            to load.
        >>>
    })
}

// ============================================================================
// FUNCTION sys.app.list
// ============================================================================
sys.app.list = function() {
    var t = new TextTable(5);
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

// ============================================================================
// DOCUMENTATION
// ============================================================================
sys.app.list.help = function() {
    setapi.helptext ({
        name:"sys.app.list",
        text:<<<
            Displays a list of all actively loaded shell applications.
        >>>
    })
}

setapi (sys.app.load, "sys.app.load");
setapi (sys.app.scan, "sys.app.scan");
setapi (sys.app.list, "sys.app.list");
