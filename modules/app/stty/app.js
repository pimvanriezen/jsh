var stty = setapi ([
    {name:"stty"},
    {setarg:"device"},
    {setarg:"speed"},
    {literal:"stty"},
    {literal:"-F"},
    {arg:"device",helptext:"Path of the tty device"},
    {arg:"speed",helptext:"Speed in bits/sec"},
    {helptext:"Sets serial device speed."}
]);

module.version = "1.0.0";
module.exports = stty;
