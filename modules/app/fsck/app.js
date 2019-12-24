var fsck = setapi ([
    {name:"fsck"},
    {setarg:"device"},
    {literal:"fsck"},
    {literal:"-y"},
    {arg:"device",helptext:"Device where the filesystem resides"},
    {console:true},
    {helptext:"Performs a filesystem check"}
]);

module.exports = fsck;
