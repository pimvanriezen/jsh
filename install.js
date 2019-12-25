var basedir="/usr/local";

if (argv.length>1) {
    basedir = argv[1];
}

/*var mycp = function(a,b) {
    echo (a + " -> " + b);
    cp (a,b);
}*/

var mycp = function(src,dst) {
    var srcid = src.replace(/.*\//,"");
    console.log (srcid.padEnd(20), " -> ", dst);
    cp (src, dst);
}

var f = function(n) { return basedir + '/' + n; }

if (! exists (f("etc/jsh"))) mkdir ("etc/jsh");
if (! exists (f("etc/jsh/modules"))) mkdir ("etc/jsh/modules");
if (! exists (f("etc/jsh/modules/global.d"))) mkdir ("etc/jsh/modules/global.d");
if (! exists (f("etc/jsh/modules/app"))) mkdir ("etc/jsh/modules/app");

mycp ("jshrc",f("etc/jsh/jshrc"));
mycp ("bin/jsh",f("bin/jsh"));
$("modules/*").each (function (file) {
    if (! file.isDir) {
        mycp (file, f("etc/jsh/"+file));
    }
});
$("modules/global.d/*.js").each (function (file) {
    mycp (file, f("etc/jsh/"+file));
});

$("modules/app/*").each (function (dir) {
    mkdir (f("etc/jsh/modules/app/"+dir));
    mycp (dir + "/app.js", f("etc/jsh/"+dir+"/app.js"));
});

