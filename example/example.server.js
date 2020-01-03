var globalStorage = require("globalstorage");
var URLMap = require("urlmap");

// Default globals on startup
globalStorage.initialize ({
    default:{
        counter:0
    }
});

var APIHandler = {};

// ============================================================================
// FUNCTION APIHandler.sysInfo
// ============================================================================
APIHandler.sysInfo = function (req) {
    req.setHeader ("X-Moose","meese");
    req.setHeader ("Content-type","application/json");
    var counter = 0;
    globalStorage.withLocked ("counter",function(c) {
        counter = c+1;
        return counter;
    });
    
    var res = {
        counter:counter,
        you:req.peer,
        id:whoami(),
        system:sys.uname(),
        modules:sys.module.list(true),
        app:sys.app.list(true)
    }
    req.send (JSON.stringify (res));
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
    404:APIHandler.notFound,
    500:APIHandler.internalError,
    get:APIHandler.root,
    "/sysinfo":{
        get:APIHandler.sysInfo
    },
    "/userinfo":{
        "/:id":{
            get:APIHandler.userInfo
        }
    }
});

request.setHandler (Map);