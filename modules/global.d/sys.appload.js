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
        if (module.override || globalThis[appname] === undefined) {
            if (module.exports) {
                globalThis[appname] = module.exports;
                globalThis[appname].app = {path:apppath};
                if (module.version) {
                    globalThis[appname].app.version = module.version;
                }
                if (module.exports.help) {
                    setapi (module.exports, appname);
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
