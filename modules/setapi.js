// ============================================================================
// API for interacting with unix tools
// ============================================================================

setapi = function(defarr) {
    var obj = function() {
        var argp = 0;
        var args = {};
        var lastp = arguments.length;
        if (lastp) {
            var last = arguments[lastp-1];
            if (typeof (last) == "object") {
                args = last;
                lastp--;
            }
        }
        var argv = [];
        for (var ai in defarr) {
            var def = defarr[ai];
            if (def.setarg) {
                if (argp < lastp) {
                    args[def.setarg] = arguments[argp++];
                }
            }
            if (def.literal) {
                argv.push (def.literal);
                continue;
            }
            if (def.opt) {
                for (var k in args) {
                    if (def.opt[k]) {
                        var val = def.opt[k];
                        if (typeof (val) == "string") {
                            val = [val];
                        }
                        for (var i in val) {
                            argv.push (val[i]);
                        }
                        argv.push (args[k]);
                    }
                }
                continue;
            }
            if (def.arg) {
                if (args[def.arg] == undefined) {
                    printerr ("Missing argument: "+def.arg);
                    return null;
                }
                argv.push (""+args[def.arg]);
                continue;
            }
            if (def.flag) {
                for (var ak in args) {
                    if (def.flag[ak]) {
                        if (args[ak]) argv.push (def.flag[ak]);
                    }
                }
            }
        }
        
        var cmd = argv.splice (0,1);
        if (cmd) cmd = cmd[0];
        if (cmd) cmd = which(cmd);
        return console.log (cmd, argv);
    }
    obj.help = function() {
        var cmd = "command";
        for (var ii in defarr) {
            if (defarr[ii].name) {
                cmd = defarr[ii].name;
                break;
            }
            if (defarr[ii].literal) {
                cmd = defarr[ii].literal;
                break;
            }
        }
        print ("Usage:     "+cmd+" (");
        var needcomma = false;
        for (var ai in defarr) {
            var def = defarr[ai];
            if (def.setarg) {
                if (needcomma) print (",");
                print (def.setarg);
                needcomma = true;
            }
        }
        if (needcomma) print (",");
        print ("<options>)\n");
        var printhdr = "Arguments: ";
        for (ai in defarr) {
            def = defarr[ai];
            if (def.arg) {
                print (printhdr);
                printhdr = "           ";
                print ((""+def.arg).padEnd(20));
                if (def.helptext) echo (def.helptext);
                else print ("Mandatory\n");
            }
        }
        printhdr = "Arguments: ";
        printhdr = "Options:   ";
        for (ai in defarr) {
            def = defarr[ai];
            if (def.arg) {
            }
            else if (def.opt) {
                for (var oi in def.opt) {
                    print (printhdr);
                    printhdr = "           ";
                    print ((""+oi).padEnd(20));
                    if (def.helptext) echo (def.helptext);
                    else print ("Option\n");
                }
            }
            else if (def.flag) {
                for (var fi in def.flag) {
                    print (printhdr);
                    printhdr = "           ";
                    print ((""+fi).padEnd(20));
                    if (def.helptext) echo ("Flag: " + def.helptext);
                    else print ("Flag\n");
                }
            }
            else if (def.helptext) {
                print ("\n"+def.helptext+"\n");
            }
        }
    }
    return obj;
}

module.exports = setapi;
