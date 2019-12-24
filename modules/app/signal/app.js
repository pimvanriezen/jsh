var signal_mkapi = function(type) {
    return setapi([
        {name:"signal."+type.toLowerCase()},
        {setarg:"pid"},
        {literal:"kill"},{literal:"-"+type},
        {arg:"pid",helptext:"Process id to signal"},
        {helptext:"Sends SIG"+type+" signal to process."}
    ]);
};

var signal = {
    help:function(){echo ("Usage: signal.term | signal.kill | "+
                          "signal.stop | signal.hup | signal.resume | "+
                          "signal.usr1");},
    term:signal_mkapi("TERM"),
    kill:signal_mkapi("KILL"),
    stop:signal_mkapi("STOP"),
    hup:signal_mkapi("HUP"),
    resume:signal_mkapi("RESUME"),
    usr1:signal_mkapi("USR1")
};

module.version = "1.0.0";
module.exports = signal;
