// ============================================================================
// JSH Installer
// ============================================================================
var basedir="/usr/local";

if (argv.length>1) {
    basedir = argv[1];
}
else if (env.PREFIX) basedir = env.PREFIX;
if (basedir == "/usr") {
    etcdir = "/etc";
}
else {
    etcdir = basedir + "/etc";
}

// ============================================================================
// Some functions for copying files, and keeping track of what we did.
// ============================================================================
var copied = 0;
var bannersize = 0;
var copiedfiles = [];
var dirmode = true;

// ----------------------------------------------------------------------------
// Prints out how many files we copies or directories we created
// ----------------------------------------------------------------------------
var dumpCopied = function(nocopies) {
    var endtag;
    if (dirmode) {
        endtag = " "+copied+" director"+(copied==1 ? "y":"ies");
    }
    else {
        endtag = " "+copied+" file"+(copied==1 ? "":"s");
    }
    if (nocopies) endtag = "";
    endtag = endtag.padEnd (sys.winsize() - bannersize - 8);
    echo (endtag + " [ \033[1mok\033[0m ]");
    if (copied) {
        dump (copiedfiles, false, 2);
    }
    copied = 0;
    copiedfiles = [];
}

// ----------------------------------------------------------------------------
// Copies a file, provided the destination file doesn't exist, or has an
// MD5 checksum different than the source.
// ----------------------------------------------------------------------------
var installFile = function(src,dst,srcid) {
    if (! srcid) srcid = src.replace(/.*\//,"");
    if ((! exists (dst)) || md5sum (src) != md5sum (dst)) {
        if (! cp (src, dst)) {
            if (! rm (dst, {force:true})) {
                throw (new Error ("Error copying to "+dst));
            }
            if (! cp (src, dst)) {
                throw (new Error ("Error copying to "+dst));
            }
        }
        copied++;
        copiedfiles.push (dst);
    }
}

// ----------------------------------------------------------------------------
// Creates a direcotry
// ----------------------------------------------------------------------------
var createDir = function(name,mode) {
    copied++;
    copiedfiles.push(name);
    mkdir (name, mode);
}

// ----------------------------------------------------------------------------
// Announces the next action we will take
// ----------------------------------------------------------------------------
var printBanner = function(txt) {
    var bannerstr = "* "+txt+"...";
    bannersize = bannerstr.length;
    print (bannerstr);
}

// ----------------------------------------------------------------------------
// Turns a relative filename into a destination path
// ----------------------------------------------------------------------------
var f = function(n) { return basedir + '/' + n; }

// ============================================================================
// The actual install job
// ============================================================================
printBanner ("Creating filesystem structure");
var dirs = [
    "lib/jsh",
    "lib/jsh/modules",
    "lib/jsh/modules/global.d",
    "lib/jsh/app"
];

for (var i in dirs) {
    var d = dirs[i];
    if (! exists (f(d))) createDir (f(d));
}

dumpCopied();
dirmode = false;

// ----------------------------------------------------------------------------
printBanner ("Copying base files");
installFile ("jshrc",f("lib/jsh/jshrc"));
installFile ("bin/jsh",f("bin/jsh"));
installFile ("bin/jshttpd",f("sbin/jshttpd"));
dumpCopied();

// ----------------------------------------------------------------------------

cd("js");
printBanner("Copying base modules");
$("modules/*.js").each (function (file) {
    if (! stat(file).isDir) {
        installFile (file, f("lib/jsh/"+file));
    }
});
dumpCopied();

// ----------------------------------------------------------------------------
printBanner ("Copying global includes");
$("modules/global.d/*.js").each (function (file) {
    installFile (file, f("lib/jsh/"+file));
});
dumpCopied();

// ----------------------------------------------------------------------------
printBanner("Removing outdated global includes");
$(f("lib/jsh/modules/global.d/*.js")).each (function (file) {
    fnam = file.replace (/.*\//, "");
    if (! exists ("modules/global.d/"+fnam)) {
        rm (file);
        copiedfiles.push (file);
        copied++;
    }
});
dumpCopied();

// ----------------------------------------------------------------------------
printBanner ("Copying apps");
$("app/*.app.js").each (function (app) {
    installFile (app, f("lib/jsh/"+app));
});
dumpCopied();

cd(-1);
