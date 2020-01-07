// ============================================================================
// CONSTRUCTOR
// ============================================================================
var Pipe = function() {
    this.in = new File();
    this.out = new File();
    this.pid = 0;
}

#ifdef IS_INTERACTIVE
Pipe.help = function() {
    setapi.helptext({
        name:"p = run.pipe",
        args:[
            {name:"cmd",text:"Command"},
            {name:"args",text:"Arguments"}
        ],
        text:<<<`
            Special class for keeping open a pipe to a spawned process
            through run.pipe(). Contains two File objects, p.in and
            p.out, and a bunch of methods to make the object act like
            a File object itself.
            
            Available functions on constructed objects:
        `>>>
    });

    var list = [];
    for (var i in Pipe.prototype) {
        if (Pipe.prototype[i].help) list.push("Pipe::"+i);
    }

    print (new TextGrid().setData(list).indent(4).format());
}

setapi (Pipe, "Pipe");
#endif

// ============================================================================
// METHOD Pipe::setData
// --------------------
// Imports two filedescriptors and child pid, as it came out of sys.runpipe().
// ============================================================================
Pipe::setData = function(infd,outfd,pid) {
    this.in.fd = infd;
    this.out.fd = outfd;
    this.pid = pid;
}

// ============================================================================
// METHOD Pipe::close
// ============================================================================
Pipe::close = function() {
    this.in.close();
    this.out.close();
    
    if (this.pid) {
        sys.closepipe (this.pid);
        this.pid = 0;
    }
}

#ifdef IS_INTERACTIVE
Pipe::close.help = function() {
    setapi.helptext({
        name:"p.close",
        text:<<<`
            Closes the pipe. If the background process is still
            running, it will be sent a SIGTERM.
        `>>>
    })
}
#endif

// ============================================================================
// I/O methods redirect to the relevant in/out descriptors.
// ============================================================================
Pipe::write = function() {
    return this.out.write.apply (this.out, arguments);
}

Pipe::writeLine = function() {
    return this.out.writeLine.apply (this.out, arguments);
}

Pipe::read = function() {
    return this.in.read.apply (this.in, arguments);
}

Pipe::readLine = function() {
    return this.in.readLine.apply (this.in, arguments);
}

Pipe::canRead = function() {
    return this.in.canRead();
}

Pipe::canWrite = function() {
    return this.out.canWrite();
}

#ifdef IS_INTERACTIVE
Pipe::write.help = File::write.help;
Pipe::writeLine.help = File::writeLine.help;
Pipe::read.help = File::read.help;
Pipe::readLine.help = File::readLine.help;
Pipe::canRead.help = File::canRead.help;
Pipe::canWrite.help = File::canWrite.help;
#endif

module.exports = Pipe;
