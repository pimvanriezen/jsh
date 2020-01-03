var URLMap = function(data) {
    this.map = data ? data : {};
    return this;
}

URLMap::perform = function(req,obj) {
    try {
        var res = 0;
        if (Array.isArray (obj)) {
            for (var i=0; i<obj.length; ++i) {
                res = obj[i](req);
                if (res) return res;
            }
            return 0;
        }
        res = obj(req);
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
    if (obj.access) {
        var res = this.perform (req,obj.access);
        if (res) return res;
    }
    if (idx == urlsplit.length) {
        var method = req.method.toLowerCase();
        if (obj[method]) {
            return this.perform (req,obj[method]);
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
