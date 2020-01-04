var URLMap = function(data) {
    this.map = data ? data : {};
    return this;
}

URLMap.mimedb = {
    "js":"application/javascript",
    "html":"text/html",
    "png":"image/png",
    "jpg":"image/jpeg",
    "gif":"image/gif",
    "c":"text/plain",
    "h":"text/plain",
    "md":"text/markdown",
    "json":"application/json"
}

URLMap::call = function(req,path,obj) {
    if (typeof (obj) == "function") return obj(req, path);
    if (typeof (obj) == "string") {
        if (req.url.split('/').contains("..")) {
            return this.errorReturn (req, 404);
        }
        var fn = obj + '/' + path;
        var st = stat(fn);
        if (st && (! st.isDir)) {
            var mime = "application/octet-stream";
            if (this.map.options && this.map.options.mimeMap) {
                mime = this.map.options.mimeMap (fn);
            }
            else {
                var ext = fn.split('.').slice(-1);
                if (URLMap.mimedb[ext]) {
                    mime = URLMap.mimedb[ext];
                }
            }
            req.setHeader ("Content-type", mime);
            req.sendFile (fn);
            return 200;
        }
        else if (st && st.isDir) {
            if (this.map.options && this.map.options.directoryIndex) {
                if (typeof (this.map.options.directoryIndex) == "function") {
                    return this.map.options.directoryIndex (req, fn);
                }
                var urldir = req.url;
                if (! urldir.endsWith('/')) urldir = urldir+'/';

                req.send (<<<`
                    <html>
                      <head><title>Index of ${urldir}</title>
                      <body>
                        <h1>Index of ${urldir}</h1>
                `>>>);
                var d = dir (fn);
                for (var k in d) {
                    if (k[0] == '.') continue;
                    if (d[k].isDir) {
                        req.send (<<<`
                            <a href="${urldir}${k}/">${k}/</a><br/>
                        `>>>);
                    }
                    else {
                        req.send (<<<`
                            <a href="${urldir}${k}">${k}</a><br/>
                        `>>>);
                    }
                }
                req.send ("</body></html>\n");
                return 200;
            }
        }
        return this.errorReturn (req, 404);
    }
}

URLMap::perform = function(req,path,obj) {
    try {
        var res = 0;
        if (Array.isArray (obj)) {
            for (var i=0; i<obj.length; ++i) {
                res = this.call (req, path, obj[i]);
                if (res) return res;
            }
            return 0;
        }
        res = this.call (req, path, obj);
        return res;
    }
    catch (e) {
        req.error = e.msg ? e.msg : e;
        req.clear();
        return this.errorReturn (req, 500);
    }
}

URLMap::errorReturn = function(req, code) {
    if (this.map[code]) {
        this.map[code](req);
        return code;
    }
    
    req.send (<<<`
        <html>
          <head><title>Error ${code}</title></head>
          <body>
            <h1>HTTP Error ${code}</h1>
            An HTTP error of this type was returned, but no default
            page for this error class was defined.
          </body>
        </html>
    `>>>);
    return code;
}

URLMap::resolveHandler = function(obj,urlsplit,idx,req) {
    var pathleft = urlsplit.slice(idx).join('/');
    if (obj.access) {
        var res = this.perform (req,pathleft,obj.access);
        if (res) return res;
    }
    if (idx == urlsplit.length) {
        var method = req.method.toLowerCase();
        if (obj[method]) {
            return this.perform (req,pathleft,obj[method]);
        }
        
        return this.errorReturn (req, 404);
    }
    else if (obj['/'+urlsplit[idx]]) {
        return this.resolveHandler (obj['/'+urlsplit[idx]],urlsplit,idx+1,req);
    }
    for (var k in obj) {
        if (k.startsWith('/:')) {
            req.parameters[k.substr(2)] = urlsplit[idx];
            return this.resolveHandler (obj[k],urlsplit,idx+1,req);
        }
    }
    
    return this.errorReturn (req, 404);
}    

URLMap::resolve = function(req) {
    req.parameters = {};
    var urlsplit = req.url.split ('/');
    if (urlsplit[0] == '') urlsplit.splice (0,1);
    if (urlsplit[urlsplit.length-1] == '') {
        urlsplit.splice (urlsplit.length-1,1);
    }
    return this.resolveHandler (this.map, urlsplit, 0, req);
}

module.exports = URLMap;
