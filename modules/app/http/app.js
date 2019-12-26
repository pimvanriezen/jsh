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
    {arg:"url",helptext:"Request URL"},
    {opt:{"timeout":"--connect-timeout"},helptext:"Connection timeout"},
    {flag:{"insecure":"-k"},helptext:"Ignore certificate errors"},
    {process:function(dt,args) {
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

http.delete = function (url, outheaders, inheaders) {
    return http("DELETE",url,{headers:outheaders,returnheaders:inheaders});
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

module.version = "1.0.1";
module.exports = http;
