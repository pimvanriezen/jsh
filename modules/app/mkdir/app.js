var mkdir = setapi ([
    {name:"mkdir"},
    {setarg:"path"},
    {arg:"path",helptext:"Path of directory to create"},
    {arg:"mode",def:0755,helptext:"Permissions (number)"},
    {f:function(args) {
        if (typeof (args.mode) != "number") {
            printerr ("Illegal mode, expecting number");
            return false;
        }
        return sys.mkdir (args.path, args.mode);
    }},
    {helptext:"Creates a directory."}
]);

module.exports = mkdir;
