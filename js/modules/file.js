// ============================================================================
// CONSTRUCTOR
// ============================================================================
var File = function() {
    this.fd = null;
    this.rdbuf = "";
    this.enc = new TextEncoder();
    this.dec = new TextDecoder();
}

File.help = function() {
    setapi.helptext({
        name:"f = new File",
        text:<<<
            Class for dealing with files in a more granular fashion than
            just smashing their whole contents into a string.
            
            Available functions on constructed objects:
        >>>
    });
    
    var list = [];
    for (var i in File) {
        if (File[i].help) list.push("File."+i);
    }

    print (new AutoColumn().setData(list).indent(4).format());
}

setapi (File, "File");

// ============================================================================
// METHOD File::openread
// ============================================================================
File::openread = function(fnam) {
    var fd = sys.io.open (fnam, "r");
    if (! fd) return false;
    this.fd = fd;
    return true;
}

File.openread = {help:function() {
    setapi.helptext ({
        name:"f.openread",
        args:[
            {name:"filename",text:"The file to open"}
        ],
        text:<<<
            Opens a filesystem file for reading. Returns false if the
            file could not be opened.
        >>>
    });
}}

setapi (File.openread, "File.openread");

// ============================================================================
// METHOD File::openwrite
// ============================================================================
File::openwrite = function(fnam,perm) {
    if (! perm) perm = 0644;
    var fd = sys.io.open (fnam, "wt");
    if (! fd) return false;
    sys.chmod (fnam, perm);
    this.fd = fd;
    return true;
}

File.openwrite = {help:function() {
    setapi.helptext ({
        name:"f.openwrite",
        args:[
            {name:"filename",text:"The file to open"}
        ],
        text:<<<
            Opens a filesystem file for writing. Returns false if the
            file could not be opened.
        >>>
    });
}}

setapi (File.openwrite, "File.openwrite");

// ============================================================================
// METHOD File::openappend
// ============================================================================
File::openappend = function(fnam,perm) {
    if (! perm) perm = 0644;
    if (exists (fnam)) perm = 0;
    var fd = sys.io.open (fnam, "a");
    if (! fd) return false;
    if (perm) sys.chmod (fnam, perm);
    this.fd = fd;
    return true;
}

File.openappend = {help:function() {
    setapi.helptext ({
        name:"f.openappend",
        args:[
            {name:"filename",text:"The file to open"}
        ],
        text:<<<
            Opens a filesystem file for writing, but appending to the end
            of the file if it already exists. Returns false if the
            file could not be opened.
        >>>
    });
}}

setapi (File.openappend, "File.openappend");

// ============================================================================
// METHOD File::close
// ============================================================================
File::close = function() {
    if (! this.fd) return;
    sys.io.close (this.fd);
}

File.close = {help:function() {
    setapi.helptext ({
        name:"f.close",
        text:<<<
            Closes the associated file (if it is not already closed).
        >>>
    });
}}

setapi (File.close, "File.close");

// ============================================================================
// METHOD File::read
// ============================================================================
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

File.read = {help:function() {
    setapi.helptext ({
        name:"f.read",
        args:[
            {name:"size",text:"Number of bytes to read"}
        ],
        text:<<<
            Reads data from an open file. Tries to read the provided
            number of bytes, but if the end-of-file is reached before,
            less are returned.
        >>>
    });
}}

setapi (File.read, "File.read");

// ============================================================================
// METHOD File::readln
// ============================================================================
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

File.readln = {help:function() {
    setapi.helptext ({
        name:"f.readln",
        text:<<<
            Tries to read a line of text from an open file. Returns
            the line without its trailing newline. If the last line
            of a file has no newline, this mischief is ignored.
            Returns null if no line could be read because the file
            ran out of them (or some other error occured).
        >>>
    });
}}

setapi (File.readln, "File.readln");

// ============================================================================
// METHOD File::write
// ============================================================================
File::write = function(str) {
    if (! this.fd) return false;
    if (! sys.io.write (this.fd, this.enc.encode (str))) {
        sys.io.close (this.fd);
        this.fd = null;
        return false;
    }
    return true;
}

File.write = {help:function() {
    setapi.helptext ({
        name:"f.write",
        args:[
            {name:"data",text:"Data to write"}
        ],
        text:<<<
            Writes data to an opened file. Returns false if the data
            could not be written.
        >>>
    });
}}

setapi (File.write, "File.write");

// ============================================================================
// METHOD File::writeln
// ============================================================================
File::writeln = function(str) {
    return this.write (str + '\n');
}

File.writeln = {help:function() {
    setapi.helptext ({
        name:"f.writeln",
        args:[
            {name:"data",text:"Text to write"}
        ],
        text:<<<
            Writes data to an opened file, with a newline appended. Returns
            false if the data could not be written.
        >>>
    });
}}

setapi (File.writeln, "File.writeln");

// ============================================================================
// METHOD File::printf
// ============================================================================
File::printf = function() {
    return this.write (sprintf.apply (null, arguments));
}

File.printf = {help:function() {
    setapi.helptext ({
        name:"f.printf",
        args:[
            {name:"fmt",text:"Format string (optional arguments follow)"}
        ],
        text:<<<
            Writes formatted text to an open file. See help(printf) for
            format specifications. Returns false if the data could not
            be written.
        >>>
    });
}}

setapi (File.printf, "File.printf");

// ============================================================================
// METHOD File::printf
// ============================================================================
File::eof = function() {
    if (this.rdbuf.length >= 0) return false;
    if (! this.fd) return true;
    return false;
}

File.eof = {help:function() {
    setapi.helptext ({
        name:"f.eof",
        text:<<<
            Returns true if no more data can be read from (or written to)
            the file.
        >>>
    });
}}

setapi (File.eof, "File.eof");

module.exports = File;
