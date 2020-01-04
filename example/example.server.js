// ============================================================================
// JSHTTPd Example
// ---------------
// Spawn this program with jshttpd, i.e.:
//     $ jshttpd -p 8888 example.server.js
// ============================================================================
var globalStorage = require("globalstorage");
var URLMap = require("urlmap");

// Default globals on startup
globalStorage.initialize ({
    default:{
        counter:0
    }
});

console.log ("[INFO] Thread allocated");

var APIHandler = {};

// ============================================================================
// FUNCTION APIHandler.sysInfo
// ============================================================================
APIHandler.sysInfo = function (req) {
    req.setHeader ("X-Moose","meese");
    req.setHeader ("Content-type","application/json");
    var counter = 0;
    
    // Locks default.counter in global storage, increases its value
    // and stores it back.
    globalStorage.withLocked ("counter",function(c) {
        counter = c+1;
        return counter;
    });

    // Send out the results    
    req.send ({
        counter:counter,
        you:req.peer,
        id:whoami(),
        system:sys.uname(),
        modules:sys.module.list(true),
        app:sys.app.list(true)
    });
    return 200;
}

// ============================================================================
// FUNCTION APIHandler.root
// ============================================================================
APIHandler.root = function (req) {
    req.setHeader ("Content-type","text/html");
    req.send (<<<`
        <html>
            <head><title>Welcome to my server</title></head>
            <body>
                <h1>Example page from jshttpd</h1>
                Your advertisement could be here. Thank God it isn't.
                <br>
                Your browser is ${req.getHeader("user-agent")}
            </body>
        </html>
    `>>>);
    return 200;
}

// ============================================================================
// FUNCTION APIHandler.userInfo
// ============================================================================
APIHandler.userInfo = function (req) {
    var user = userdb[req.parameters.id];
    if (user) {
        req.send (user);
        return 200;
    }
    return Map.errorReturn (req, 404);
}

// ============================================================================
// FUNCTION APIHandler.logRequest
// ============================================================================
APIHandler.logRequest = function (req) {
    console.log ("[HTTP]",req.peer,req.method,req.url);
    return 0;
}

// ============================================================================
// FUNCTION APIHandler.notFound
// ============================================================================
APIHandler.notFound = function (req) {
    req.send (<<<`
        <html>
          <head><title>Not Found</title></head>
          <body>
            <h1>404 Not Found</h1>
            Could not resolve url: ${req.url}
          </body>
        </html>
    `>>>);
}

// ============================================================================
// FUNCTION APIHandler.internalError
// ============================================================================
APIHandler.internalError = function (req) {
    req.send (<<<`
        <html>
          <head><title>Internal Server Error</title></head>
          <body>
            <h1>500 Internal Server Error</h1>
            ${req.error}
          </body>
        </html>
    `>>>);
}

// ============================================================================
// Route Map
// ============================================================================
var Map = new URLMap({
    options:{
        // Turns on directory indexing for the file server. If a function
        // is provided instead of a boolean, the function will be called
        // with the request object and the path relative to the fileserver
        // root as arguments.
        directoryIndex:true
    },
    // Maps standard output handlers for specific HTTP status values if
    // they arise from the Map doing its work. With the exception of a
    // 500 error that arises when parsing a handler, these do not get
    // called if an error status is returned from the handler. They
    // can still be used by calling Map.errorReturn (req, code).
    404:APIHandler.notFound,
    500:APIHandler.internalError,
    // The 'access' url always gets called, even if we're not at the end
    // of resolving the url path. This can be useful to inject stuff like
    // access control, or, in this case, logging.
    access:APIHandler.logRequest,
    // The get/post/put/delete handlers are specific for the point in the
    // tree we're at, so in this case, the handler only gets called when
    // there's a GET /
    get:APIHandler.root,
    // Sub-paths with its own handlers
    "/sysinfo":{
        get:APIHandler.sysInfo
    },
    "/userinfo":{
        // This means the name of the next element is arbitrary, and should
        // be put into req.parameters.
        "/:id":{
            get:APIHandler.userInfo
        }
    },
    "/modules":{
        // If set to a string instead of a function, it is assumed to be
        // set to the path that should act as the root for the fileserver
        // while serving files from this point down.
        access:"js/modules"
    }
});

request.setHandler (Map);
