sys.appload = function(appname, apppath) {
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
        printerr ("Error loading "+appname+": "+e);
        return false;
    }
    
    sys._modules[appname] = {
        fileName:apppath,
        size:src.length,
        type:"app"
    }    
}
