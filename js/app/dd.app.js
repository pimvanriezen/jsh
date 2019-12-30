var dd = setapi ([
    {name:"dd"},
    {
        opt:{"inputFile":[]},
        helptext:"Load input data from file. If omitted, a steam of NUL "+
                 "characters is used."
    },
    {opt:{"outputFile":[]},helptext:"Output file to write to"},
    {opt:{"count":[]},helptext:"Number of blocks to copy"},
    {opt:{"blockSize":[]},helptext:"Read/write block size in bytes"},
    {
        opt:{"inputOffset":[]},
        helptext:"Offset in blocks to start reading from"
    },
    {
        opt:{"outputOffset":[]},
        helptext:"Offset in blocks to seek forward on destination prior "+
                 "to writing"
    },
    {flag:{"noTruncate":""},helptext:"Don't truncate output file"},
    {flag:{"sparse":""},helptext:"Write output sparsely, skipping empty blocks"},
    {helptext:<<<`
        Copies binary data between two files/devices.
    `>>>},
    {f:function(args) {
        argv = [];
        if (args.inputFile) argv.push ("if="+args.inputFile);
        else {
            if (! args.count) {
                printerr ("Cannot write zero without a block count");
                return false;
            }
            argv.push ("if=/dev/zero");
        }
        if (args.outputFile) argv.push ("of="+args.outputFile);
        else {
            printerr ("No output file specified");
            return false;
        }
        if (args.count) argv.push ("count="+parseInt(args.count));
        if (args.blockSize) argv.push ("bs="+parseInt(args.blockSize));
        else argv.push ("bs=1024");
        if (args.inputOffset) argv.push ("skip="+parseInt(args.inputOffset));
        if (args.outputOffset) argv.push ("seek="+parseInt(args.outputOffset));
        if (args.noTruncate) {
            if (args.sparce) {
                argv.push ("conv=notrunc,sparse");
            }
            else argv.push("conv=notrunc");
        }
        else if (args.sparse) argv.push ("conv=sparse");
        if (! sys.run ("dd", argv)) return false;
        return;
    }}
]);

dd.zero = setapi ([
    {name:"dd.zero"},
    {setarg:"file"},
    {setarg:"size"},
    {arg:"file",helptext:"Output file"},
    {arg:"size",helptext:"Desired size in 1KB blocks"},
    {helptext:<<<`
        Creates a new file, filled with zeroes to a specific size.
    `>>>},
    {f:function(args) {
        return dd({outputFile:args.file,count:args.size});
    }}
]);

module.version = "1.0.1";
module.exports = dd;
