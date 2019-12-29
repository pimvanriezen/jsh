var File = function() {
    this.fd = null;
    this.rdbuf = "";
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
}

File::openread = function(fnam) {
    var fd = sys.io.open (fnam, "r");
    if (! fd) return false;
    this.fd = fd;
    return true;
}

File::openwrite = function(fnam,perm) {
    if (! perm) perm = 0644;
    var fd = sys.io.open (fnam, "wt");
    if (! fd) return false;
    sys.chmod (fnam, perm);
    this.fd = fd;
    return true;
}

File::openappend = function(fnam,perm) {
    if (! perm) perm = 0644;
    if (exists (fnam)) perm = 0;
    var fd = sys.io.open (fnam, "a");
    if (! fd) return false;
    if (perm) sys.chmod (fnam, perm);
    this.fd = fd;
    return true;
}

File::close = function() {
    if (! this.fd) return;
    sys.io.close (this.fd);
}

File::readln = function() {
    if (! this.fd) return null;
    var nl = this.rdbuf.indexOf ('\n');
    while (nl<0) {
        var inbuf = sys.io.read (this.fd, 256);
        if (! inbuf) {
            sys.io.close (this.fd);
            this.fd = null;
            if (this.rdbuf.length) {
                var res = this.rdbuf;
                this.rdbuf = "";
                return res;
            }
            return null;
        }
        this.rdbuf += this.dec.decode (inbuf);
        nl = this.rdbuf.indexOf ('\n');
    }
    var res = this.rdbuf.slice (0, nl);
    this.rdbuf = this.rdbuf.substr (nl+1);
    return res;
}

File::write = function(str) {
    if (! this.fd) return false;
    if (! sys.io.write (this.fd, this.enc.encode (str))) {
        sys.io.close (this.fd);
        this.fd = null;
        return false;
    }
    return true;
}

File::writeln = function(str) {
    return this.write (str + '\n');
}

File::printf = function() {
    return this.write (sprintf.apply (null, arguments));
}

File::read = function(sz) {
    var res = "";
    if (! this.fd) return null;
    if (this.rdbuf.length >= sz) {
        res = this.rdbuf.slice (0,sz);
        this.rdbuf = this.rdbuf.substr (sz);
        return res;
    }
    var inbuf = sys.io.read (this.fd, sz - (this.rdbuf.length));
    if (! inbuf) {
        sys.io.close (this.fd);
        this.fd = null;
        if (! this.rdbuf.length) return null;
        res = this.rdbuf;
        this.rdbuf = "";
        return res;
    }
    res = this.rdbuf.slice (0,sz);
    this.rdbuf = this.rdbuf.substr (sz);
    return res;
}

File::eof = function() {
    if (this.rdbuf.length >= 0) return false;
    if (! this.fd) return true;
    return false;
}

module.exports = File;
