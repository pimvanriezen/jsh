var http = setapi ([
    {name:"http"},
    {setarg:"method"},
    {setarg:"url"},
    {setarg:"data"},
    {literal:"curl"},
    {literal:"-i"},
    {literal:"-L"},
    {literal:"-s"},
    {literal:"-X"},
    {arg:"method",helptext:"Request method (e.g., POST)"},
    {literal:function(args) {
        var ret = [];
        if (args.headers) for (var i in args.headers) {
            ret.push ("-H");
            ret.push (i + ": "+args.headers[i]);
        }
        return ret;
    }},
    {opt:{"data":"--data-binary"},helptext:"Data to submit"},
    {opt:{"save":"-o"},helptext:<<<
        Filename of file to write the output to. The body/headers will
        not be returned, only true or false.
    >>>},
    {arg:"url",helptext:"Request URL"},
    {opt:{"timeout":"--connect-timeout"},helptext:"Connection timeout"},
    {flag:{"insecure":"-k"},helptext:"Ignore certificate errors"},
    {process:function(dt,args) {
        if (args.save!="") return dt;
        var hdrend = (""+dt).indexOf('\r\n\r\n');
        if (hdrend<0) return false;
        
        var body = dt.substr(hdrend+4);
        var hdrlines = dt.substr(0,hdrend).split('\r\n');
        if (hdrlines[0].split(' ')[1] == "301") {
            hdrend = (""+body).indexOf('\r\n\r\n');
            hdrlines = body.substr(0,hdrend).split('\r\n');
            body = body.substr(hdrend+4);
        }
        var status = parseInt (hdrlines[0].split(' ')[1]);
        hdrlines.splice(0,1);
        if (typeof (args.returnheaders) == "object") {
            args.returnheaders["HTTP_STATUS"] = status;
            for (var i in hdrlines) {
                var ln = hdrlines[i];
                var clpos = (""+ln).indexOf(': ');
                if (clpos<0) continue;
                var hdrname = ln.substr (0,clpos);
                var hdrval = ln.substr (clpos+2);
                args.returnheaders[hdrname] = hdrval;
            }
        }
        
        var res;
        
        try {
            res = JSON.parse (body);
            return res;
        }
        catch (e) {
            return body;
        }
        return null;
    }},
    {helptext:<<<
        Performs a HTTP request. Output headers and return headers are
        in option fields called "headers" and "returnheaders"
        respectively.
     >>>}
]);

http.get = function (url, outheaders, inheaders) {
    return http("GET",url,{headers:outheaders,returnheaders:inheaders});
}

http.get.help = function() {
    setapi.helptext({
        name:"http.get",
        args:[
            {name:"url",text:"The URL to call"},
            {name:"outheaders",text:<<<
                An optional key/value dictionary containing any extra HTTP
                headers that should be sent along with the request.
            >>>},
            {name:"inheaders",text:<<<
                An optional object that will be filled with the HTTP return
                headers if it is passed.
            >>>}
        ],
        text:<<<
            Performs an HTTP GET request. Returns the body data, parsed
            as JSON if possible. Returns false if the request failed.
            If return headers are being tracked, an extra header
            with the key of HTTP_STATUS indicates the status code
            returned by the server.
        >>>
    });
}

http.download = function (url, filename, outheaders) {
    if (! filename) filename = url.replace(/\?.*/,"").replace(/.*\//,"");
    return http("GET",url,{save:filename,headers:outheaders});
}

http.download.help = function() {
    setapi.helptext({
        name:"http.download",
        args:[
            {name:"url",text:"The URL to fetch"},
            {name:"filename",text:<<<
                Path of file to save to, if this is not provided, a
                file with the name of the last path element of the request
                URI will be saved to the current working directory.
            >>>},
            {name:"outheaders",text:<<<
                An optional key/value dictionary containing any extra HTTP
                headers that should be sent along with the request.
            >>>},
        ],
        text:<<<
            Performs an HTTP GET request against the given URL, and saves
            the output to a file.
        >>>
    });
}

http.delete = function (url, outheaders, inheaders) {
    return http("DELETE",url,{headers:outheaders,returnheaders:inheaders});
}

http.delete.help = function() {
    setapi.helptext({
        name:"http.delete",
        args:[
            {name:"url",text:"The URL to call"},
            {name:"outheaders",text:<<<
                An optional key/value dictionary containing any extra HTTP
                headers that should be sent along with the request.
            >>>},
            {name:"inheaders",text:<<<
                An optional object that will be filled with the HTTP return
                headers if it is passed.
            >>>}
        ],
        text:<<<
            Performs an HTTP DELETE request. Returns the body data, parsed
            as JSON if possible. Returns false if the request failed.
            If return headers are being tracked, an extra header
            with the key of HTTP_STATUS indicates the status code
            returned by the server.
        >>>
    });
}

http.post = function (url, data, outheaders, inheaders) {
    var outhdr = outheaders;
    var outbody;
    if (typeof (data) == "object") {
        if (! outhdr) outhdr = {};
        if (! outhdr["Content-type"]) {
            outhdr["Content-type"] = "application/json";
        }
        outbody = JSON.stringify (data);
    }
    else {
        outbody = ""+data;
    }
    return http("POST",url,data,{headers:outhdr,returnheaders:inheaders});
}

http.post.help = function() {
    setapi.helptext({
        name:"http.get",
        args:[
            {name:"url",text:"The URL to call"},
            {name:"data",text:<<<
                The data to post. If this argument is an object, it is
                encoded into JSON and, if no explicit Content-type header
                is set for the request, a default of "application/json"
                will be generated.
            >>>},
            {name:"outheaders",text:<<<
                An optional key/value dictionary containing any extra HTTP
                headers that should be sent along with the request.
            >>>},
            {name:"inheaders",text:<<<
                An optional object that will be filled with the HTTP return
                headers if it is passed.
            >>>}
        ],
        text:<<<
            Performs an HTTP POST request. Returns the body data, parsed
            as JSON if possible. Returns false if the request failed.
            If return headers are being tracked, an extra header
            with the key of HTTP_STATUS indicates the status code
            returned by the server.
        >>>
    });
}

http.put = function (url, data, outheaders, inheaders) {
    var outhdr = outheaders;
    var outbody;
    if (typeof (data) == "object") {
        if (! outhdr) outhdr = {};
        if (! outhdr["Content-type"]) {
            outhdr["Content-type"] = "application/json";
        }
        outbody = JSON.stringify (data);
    }
    else {
        outbody = ""+data;
    }
    return http("PUT",url,data,{headers:outhdr,returnheaders:inheaders});
}

http.put.help = function() {
    setapi.helptext({
        name:"http.put",
        args:[
            {name:"url",text:"The URL to call"},
            {name:"data",text:<<<
                The data to post. If this argument is an object, it is
                encoded into JSON and, if no explicit Content-type header
                is set for the request, a default of "application/json"
                will be generated.
            >>>},
            {name:"outheaders",text:<<<
                An optional key/value dictionary containing any extra HTTP
                headers that should be sent along with the request.
            >>>},
            {name:"inheaders",text:<<<
                An optional object that will be filled with the HTTP return
                headers if it is passed.
            >>>}
        ],
        text:<<<
            Performs an HTTP PUT request. Returns the body data, parsed
            as JSON if possible. Returns false if the request failed.
            If return headers are being tracked, an extra header
            with the key of HTTP_STATUS indicates the status code
            returned by the server.
        >>>
    });
}

module.version = "1.0.2";
module.exports = http;
