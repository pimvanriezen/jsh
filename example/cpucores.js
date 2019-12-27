var cpuCores = function() {
    switch (sys.uname().sysname) {
        case "Darwin":
            return parseInt (run("sysctl -n hw.ncpu"));
        
        case "Linux":
            return load("/proc/cpuinfo").grep("^cpu cores").cut(-1).sum();
        
        default:
            return 2; // fair dice roll
    }
}

echo ("Your system has",cpuCores(),"CPU cores.");
