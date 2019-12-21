// ============================================================================
// API for interacting with unix tools
// ============================================================================

var $apidb = {};

help = function(helpfor) {
    if (helpfor && helpfor.help) return helpfor.help();
    echo ("Invoke the .help() method on a command to check for its syntax.");
    echo ("Available commands:");
    var list = [];
    var row = 0;
    for (var k in $apidb) list.push(k);
    list.sort();
    for (var k in list) {
        print (("    "+list[k]).padEnd(40));
        if (row & 1) print ("\n");
        row++;
    }
    if (row&1) print ("\n");
}

var setapi = function(arg1,arg2) {
    if (typeof (arg1) == "function") {
        if (typeof (arg1.help) == "function") {
            $apidb[arg2] = true;
            return;
        }
    }
    var defarr = arg1;
    var apitype="unix";
    var f = null;
    var processf = null;
    for (var k in defarr) {
        if (defarr[k].name) {
            $apidb[defarr[k].name] = true;
        }
        if (defarr[k].process) processf = defarr[k].process;
        if (defarr[k].f) f=defarr[k].f;
    }

    var obj = function() {
        var stdin = null;
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
                    if (def.def) args[def.arg] = def.def;
                    else {
                        printerr ("Missing argument: "+def.arg);
                        return null;
                    }
                }
                if (def.tostdin) {
                    var a = args[def.arg];
                    if (typeof (a) == "object") {
                        stdin = JSON.stringify (a);
                    }
                    else {
                        stdin = a;
                        if (def.addnewline) stdin += '\n';
                    }
                }
                else argv.push (""+args[def.arg]);
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

        var res;
        if (f) {
            res = f(args);
        }
        else {
            var cmd = argv.splice (0,1);
            if (cmd) cmd = cmd[0];
            if (cmd) cmd = which(cmd);
            if (stdin) {
                res = sys.run (cmd, argv, stdin);
            }
            else {
                res = sys.run (cmd, argv);
            }
            if (typeof(res) == "string" && res.indexOf('\n') == res.length-1) {
                res = res.substr (0,res.length-1);
            }
        }
        if (processf) res = processf (res);
        return res;
    }
    obj.help = function() {
        var t = new texttable(4);
        t.boldcolumn = 2;
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
        
        var arglist = [];
        var optcount = 0;
        for (var ai in defarr) {
            var def = defarr[ai];
            if (def.setarg) {
                arglist.push (def.setarg);
            }
            else if (def.opt || def.flag) {
                optcount++;
            }
        }
        if (optcount) arglist.push ("{..options..}");
        t.addRow ("Usage:","",cmd,'('+arglist.join(', ')+')');
        
        var argc = 0;
        var printhdr = "Arguments:";
        for (ai in defarr) {
            def = defarr[ai];
            if (def.arg) {
                var txt = def.helptext;
                if (! txt) txt = "Mandatory argument";
                t.addRow (printhdr, '['+argc+']', def.arg, txt);
                printhdr = " ";
                argc++;
            }
        }
        printhdr = "Options:";
        for (ai in defarr) {
            def = defarr[ai];
            if (def.arg) {
            }
            else if (def.opt) {
                for (var oi in def.opt) {
                    var txt = def.helptext;
                    if (!txt) txt = "Option";
                    t.addRow (printhdr,"",oi,txt);
                    printhdr = "";
                }
            }
            else if (def.flag) {
                for (var fi in def.flag) {
                    var txt = def.helptext;
                    if (!txt) txt = "Flag";
                    else txt = "Flag: " + txt;
                    t.addRow (printhdr, "", fi, txt);
                    printhdr = "";
                }
            }
            else if (def.helptext) {
                print (t.format());
                echo ("\n"+def.helptext.wrap(sys.winsize()).join('\n'));
            }
        }
    }
    return obj;
}

setapi.helptext = function(def) {
    var t = new texttable(4);
    t.boldcolumn = 2;
    var arglist = [];
    for (var ai in def.args) arglist.push (def.args[ai].name);
    if (def.opts && def.opts.length) arglist.push ("{..options..}");
    t.addRow ("Usage:","",def.name,'('+arglist.join(', ')+')');
    if (def.args && def.args.length) {
        for (var ai in def.args) {
            var ttxt = (ai==0) ? "Arguments:" : "";
            t.addRow (ttxt, '['+ai+']', def.args[ai].name, def.args[ai].text);
        }
    }
    if (def.opts && def.opts.length) {
        for (var oi in def.opts) {
            var ttxt = (oi==0) ? "Options:" : "";
            t.addRow (ttxt, oi, def.opts[ai].name, def.opts[oi].text);
        }
    }
    print (t.format());
    if (def.text) {
        echo ("");
        var txt = def.text.wrap (sys.winsize());
        for (var ln in txt) echo (txt[ln]);
    }
}

module.exports = setapi;
