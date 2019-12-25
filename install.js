var basedir="/usr/local";

if (argv.length>1) {
    basedir = argv[1];
}

/*var mycp = function(a,b) {
    echo (a + " -> " + b);
    cp (a,b);
}*/

var copied = 0;
var bannersize = 0;
var copiedfiles = [];

var dumpcopied = function(nocopies) {
    var endtag = " "+copied+" file"+(copied==1 ? "":"s");
    if (nocopies) endtag = "";
    endtag = endtag.padEnd (sys.winsize() - bannersize - 8);
    echo (endtag + " [ \033[1mok\033[0m ]");
    if (copied) {
        dump (copiedfiles, false, 2);
    }
    copied = 0;
    copiedfiles = [];
}

var mycp = function(src,dst,srcid) {
    if (! srcid) srcid = src.replace(/.*\//,"");
    if ((! exists (dst)) || md5sum (src) != md5sum (dst)) {
        cp (src, dst);
        copied++;
        copiedfiles.push (dst);
    }
}

var mymkdir = function(name,mode) {
    echo ("".padEnd(20), " MK ", name);
    mkdir (name, mode);
}

var banner = function(txt) {
    var bannerstr = "* "+txt+"...";
    bannersize = bannerstr.length;
    print (bannerstr);
}

var f = function(n) { return basedir + '/' + n; }

banner ("Creating directories");
if (! exists (f("etc/jsh"))) mymkdir ("etc/jsh");
if (! exists (f("etc/jsh/modules"))) mymkdir ("etc/jsh/modules");
if (! exists (f("etc/jsh/modules/global.d"))) mymkdir ("etc/jsh/modules/global.d");
if (! exists (f("etc/jsh/modules/app"))) mymkdir ("etc/jsh/modules/app");
dumpcopied(true);

banner ("Copying base files");
mycp ("jshrc",f("etc/jsh/jshrc"));
mycp ("bin/jsh",f("bin/jsh"));
dumpcopied();

banner("Copying base modules");
$("modules/*.js").each (function (file) {
    if (! file.isDir) {
        mycp (file, f("etc/jsh/"+file));
    }
});
dumpcopied();

banner ("Copying global includes");
$("modules/global.d/*.js").each (function (file) {
    mycp (file, f("etc/jsh/"+file));
});
dumpcopied();

banner ("Copying apps");
$("modules/app/*").each (function (dir) {
    mkdir (f("etc/jsh/"+dir));
    mycp (dir + "/app.js", f("etc/jsh/"+dir+"/app.js"),dir);
});
dumpcopied();
