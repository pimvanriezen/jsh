var md5cmd = "md5sum"
if (! which("md5sum")) md5cmd = "md5";

var md5sum = setapi ([
    {name:"md5sum"},
    {setarg:"path"},
    {literal:md5cmd},
    {arg:"path",helptext:"File to checksum"},
    {process:function(dat) {
        if (dat === true) {
            throw new Error ("md5sum did jack on "+path);
        }
        dat = dat.replace('\n','');
        if (md5cmd == "md5sum") return dat.split(' ')[0];
        return dat.replace (/^.* /,"");
    }},
    {helptext:"Get md5 checksum for a file. Returns a hexadecimal string "+
              "representing the checksum."}
]);

module.version = "1.0.0";
module.exports = md5sum;
