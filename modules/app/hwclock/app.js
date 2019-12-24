if (sys.stat ("hwclock")) {
    var hwclock = setapi([
        {name:"hwclock"},
        {literal:"hwclock"},
        {literal:"-r"},
        {helptext:"Reads out the hardware clock."}
    ]);

    hwclock.load = setapi([
        {name:"hwclock.load"},
        {literal:"hwclock"},
        {literal:"--hctosys"},
        {helptext:"Loads hardware clock into system clock."}
    ]);

    hwclock.save = setapi([
        {name:"hwclock.save"},
        {literal:"hwclock"},
        {literal:"--systohc"},
        {helptext:"Saves system clock into hardware clock."}
    ]);
    
    module.version = "1.0.0";
    module.exports = hwclock;
}
