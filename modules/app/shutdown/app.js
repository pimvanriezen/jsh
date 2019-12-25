var shutdown = setapi ([
    {name:"shutdown"},
    {literal:"shutdown"},
    {literal:"-h"},
    {arg:"when",def:"now",helptext:"Requested shutdown time"},
    {helptext:"Shuts down the system."}
]);

module.version = "1.0.0";
module.exports = shutdown;
