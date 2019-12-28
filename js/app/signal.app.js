var signal_mkapi = function(type) {
    return setapi([
        {name:"signal."+type.toLowerCase()},
        {setarg:"pid"},
        {arg:"pid",helptext:"Process id to signal"},
        {helptext:"Sends SIG"+type+" signal to process."},
        {f:function(args) {
            sys.kill (args.pid, type)
        }}
    ]);
};

var signal = {
    help:function(){echo ("Usage: signal.term | signal.kill | "+
                          "signal.stop | signal.hup | signal.resume | "+
                          "signal.usr1");},
    term:signal_mkapi("SIGTERM"),
    kill:signal_mkapi("SIGKILL"),
    stop:signal_mkapi("SIGSTOP"),
    hup:signal_mkapi("SIGHUP"),
    cont:signal_mkapi("SIGCONT"),
    usr1:signal_mkapi("SIGUSR1")
};

module.version = "1.0.1";
module.exports = signal;
