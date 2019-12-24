if (sys.stat ("mkfs")) {
    var mkfs = setapi ([
        {name:"mkfs"},
        {setarg:"device"},
        {setarg:"type"},
        {literal:"mkfs"},
        {literal:"-t"},
        {arg:"type",def:"ext4",helptext:"Filesystem type"},
        {arg:"device",helptext:"Disk device (or image file)"},
        {console:true},
        {helptext:"Creates a filesystem"}
    ]);

    module.version = "1.0.0";
    module.exports = mkfs;
}
