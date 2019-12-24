var mount = setapi ([
    {name:"mount"},
    {literal:"mount"},
    {setarg:"device"},
    {setarg:"at"},
    {opt:{"type":"-t"},helptext:"Filesystem type"},
    {opt:{"options":"-o"},helptext:"Mount options (fs-specific)"},
    {arg:"device",helptext:"Device name"},
    {arg:"at",helptext:"Mount point"},
    {helptext:"Mounts a filesystem."}
]);

mount.all = setapi ([
    {name:"mount.all"},
    {literal:"mount"},
    {opt:{"type":"-t"},helptext:"Filesystem type"},
    {literal:"-a"},
    {helptext:"Mounts all filesystems set up in /etc/fstab."}
]);

module.exports = mount;
