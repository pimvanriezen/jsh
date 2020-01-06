var Pipe = function() {
    this.in = new File();
    this.out = new File();
    this.pid = 0;
}

Pipe::setData = function(infd,outfd,pid) {
    this.in.fd = infd;
    this.out.fd = outfd;
    this.pid = pid;
}

Pipe::close = function() {
    this.in.close();
    this.out.close();
    
    if (this.pid) {
        sys.closepipe (this.pid);
        this.pid = 0;
    }
}

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

module.exports = Pipe;
