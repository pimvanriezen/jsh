var basedir="/usr/local";

if (argv.length>1) {
    basedir = argv[1];
}

/*var mycp = function(a,b) {
    echo (a + " -> " + b);
    cp (a,b);
}*/

var mycp = function(src,dst,srcid) {
    if (! srcid) srcid = src.replace(/.*\//,"");
    echo (srcid.padEnd(20), " -> ", dst);
    cp (src, dst);
}

var mymkdir = function(name,mode) {
    echo ("".padEnd(20), " MK ", name);
    mkdir (name, mode);
}

var banner = function(txt) {
    echo (("---[ "+txt+" ]").padEnd(sys.winsize(),"-"));
}

var f = function(n) { return basedir + '/' + n; }

banner ("Creating directories");
if (! exists (f("etc/jsh"))) mymkdir ("etc/jsh");
if (! exists (f("etc/jsh/modules"))) mymkdir ("etc/jsh/modules");
if (! exists (f("etc/jsh/modules/global.d"))) mymkdir ("etc/jsh/modules/global.d");
if (! exists (f("etc/jsh/modules/app"))) mymkdir ("etc/jsh/modules/app");

banner ("Copying base files");
mycp ("jshrc",f("etc/jsh/jshrc"));
mycp ("bin/jsh",f("bin/jsh"));

banner("Copying base modules");
$("modules/*").each (function (file) {
    if (! file.isDir) {
        mycp (file, f("etc/jsh/"+file));
    }
});

banner ("Copying global includes");
$("modules/global.d/*.js").each (function (file) {
    mycp (file, f("etc/jsh/"+file));
});

banner ("Copying apps");
$("modules/app/*").each (function (dir) {
    mkdir (f("etc/jsh"+dir));
    mycp (dir + "/app.js", f("etc/jsh/"+dir+"/app.js"),dir);
});

