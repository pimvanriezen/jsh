// ============================================================================
// CLASS URLMap
// ------------
// Creates a convenient way to define how an incoming HTTP url path should
// be handled.
// ============================================================================
var URLMap = function(data) {
    this.map = data ? data : {};
    return this;
}

// ============================================================================
// STATIC MEMBER: mimedb
// ---------------------
// Defines a default mapping of file extensions to mime-types for the
// fileserver.
// ============================================================================
URLMap.mimedb = {
    "js":"application/javascript",
    "html":"text/html",
    "htm":"text/html",
    "png":"image/png",
    "jpg":"image/jpeg",
    "jpeg":"image/jpeg",
    "gif":"image/gif",
    "c":"text/plain",
    "h":"text/plain",
    "md":"text/markdown",
    "json":"application/json",
    "aif":"audio/aiff",
    "aiff":"audio/aiff",
    "bmp":"image/bmp",
    "bz2":"application/x-bzip2",
    "gz":"application/x-compressed",
    "ico":"image/x-icon",
    "mp3":"audio/mpeg3",
    "zip":"application/zip",
    "tar":"application/x-tar"
}

// ============================================================================
// METHOD URLMap::call
// -------------------
// Takes an object defined as a handler. It it's a handler function, call
// it. If it's a fileserver path, do the fileserver thing.
// ============================================================================
URLMap::call = function(req,path,obj) {
    if (typeof (obj) == "function") return obj(req, path);
    if (typeof (obj) == "string") {
        // Reject path traversal
        if (req.url.split('/').contains("..")) {
            return this.errorReturn (req, 404);
        }
        
        // See if there's anything at the provided path
        var fn = obj + '/' + path;
        var st = stat(fn);
        if (st && (! st.isDir)) {
            // Resolve the MIME type
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
            // Send out the result
            req.setHeader ("Content-type", mime);
            req.sendFile (fn);
            return 200;
        }
        else if (st && st.isDir) {
            // Is the directoryIndex option set? If not, we disallow
            // them.
            if (this.map.options && this.map.options.directoryIndex) {
                // If the directoryIndex option is a function, call it
                // instead of auto-generating one.
                if (typeof (this.map.options.directoryIndex) == "function") {
                    return this.map.options.directoryIndex (req, fn);
                }
                
                // Create a generic boring directory listing
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

// ============================================================================
// METHOD URLMap::perform
// ----------------------
// Takes a singular handler, or an array of handlers, and runs through them
// all until a non-zero return is detected.
// ============================================================================
URLMap::perform = function(req,path,obj) {
    try {
        var res = 0;
        
        // If it's an array, go over each one
        if (Array.isArray (obj)) {
            for (var i=0; i<obj.length; ++i) {
                res = this.call (req, path, obj[i]);
                if (res) return res;
            }
            return 0;
        }
        
        // Just a single handler
        res = this.call (req, path, obj);
        return res;
    }
    catch (e) {
        // Uncaught exception within the handler, spit out a 500 error.
        req.error = e.msg ? e.msg : e;
        req.clear();
        return this.errorReturn (req, 500);
    }
}

// ============================================================================
// METHOD URLMap::errorReturn
// --------------------------
// Either calls a top-level error code handle, or generates a very simple
// template.
// ============================================================================
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

// ============================================================================
// METHOD URLMap::resolveHandler
// -----------------------------
// Function that recurses over the tree until a match is met that generates
// a non-zero status return.
// ============================================================================
URLMap::resolveHandler = function(obj,urlsplit,idx,req) {
    var pathleft = urlsplit.slice(idx).join('/');
    
    // Access handlers are performed regardless of whether we're at the
    // leaf end of a tree path.
    if (obj.access) {
        var res = this.perform (req,pathleft,obj.access);
        if (res) return res;
    }
    
    // Are we at a leaf node?
    if (idx == urlsplit.length) {
        var method = req.method.toLowerCase();
        if (obj[method]) {
            return this.perform (req,pathleft,obj[method]);
        }
        
        return this.errorReturn (req, 404);
    }
    else if (obj['/'+urlsplit[idx]]) {
        // We have a direct match one node deeper
        return this.resolveHandler (obj['/'+urlsplit[idx]],urlsplit,idx+1,req);
    }
    
    // No exact match found. Is there a parameter match?
    for (var k in obj) {
        if (k.startsWith('/:')) {
            req.parameters[k.substr(2)] = urlsplit[idx];
            return this.resolveHandler (obj[k],urlsplit,idx+1,req);
        }
    }
    
    // Out of luck, return a 404.
    return this.errorReturn (req, 404);
}

// ============================================================================
// METHOD URLMap::resolve
// ============================================================================
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
