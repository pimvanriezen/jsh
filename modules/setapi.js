// ============================================================================
// API for interacting with unix tools
// ============================================================================

var $apidb = {};
var $textformat = function(x) {
    var matches = {
        "@function":1,
        "[.a-zA-Z_]+\\[['\"._a-zA-Z]*\\]":1,
        "(\\b(true|false))":36,
        "(\\b(null))":31,
        "\"[^\"]+\"":32
    }
    x = x.rewrap (sys.winsize());
    for (var k in matches) {
        x = x.colorMatch (k, matches[k]);
    }
    return x;
}

help = function(helpfor) {
    if (helpfor && helpfor.help) return helpfor.help();
    if (helpfor) {
        print ($textformat(<<<
            No help available: The object provided has no .help() function
            implemented.
        >>>));
        return;
    }
    
    print ($textformat(<<<
        Call help(command) with a function of this list to check for its
        syntax. Document your own global functions by defining a
        help() property and calling setapi() on it.
        
        Available commands:
    >>>));
        
    var list = [];
    var row = 0;
    for (var k in $apidb) list.push(k);
    list.sort();
    print (autotable (list, 4));
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
        var useconsole = false;
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
            if (def.console) {
                useconsole = true;
            }
            if (def.setarg) {
                if (argp < lastp) {
                    args[def.setarg] = arguments[argp++];
                }
            }
            if (def.literal) {
                if (typeof (def.literal) == "function") {
                    argv.push (def.literal());
                }
                else argv.push (def.literal);
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
            if (useconsole) {
                res = sys.runconsole (cmd, argv);
                if (res === true) res = undefined;
            }
            else if (stdin) {
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
    obj.unixcmd = function() {
        for (var ii in defarr) {
            var lit = defarr[ii].literal;
            if (lit) {
                if (typeof (lit) == "function") return lit();
                return lit;
            }
        }
        return null;
    }
    obj.help = function() {
        var t = new texttable(4);
        var argi = {}
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
        var argc = 0;
        var optcount = 0;
        for (var ai in defarr) {
            var def = defarr[ai];
            if (def.setarg) {
                arglist.push (def.setarg);
                argi[def.setarg] = argc++;
            }
            else if (def.opt || def.flag) {
                optcount++;
            }
        }
        if (optcount) arglist.push ("{..options..}");
        t.addRow ("Usage:","",cmd,'('+arglist.join(', ')+')');
        
        var printhdr = "Arguments:";
        for (ai in defarr) {
            def = defarr[ai];
            if (def.arg) {
                var txt = def.helptext;
                if (! txt) txt = "Mandatory argument";
                if (def.def) {
                    txt = '[default: '+def.def+'] '+txt;
                }
                argc = argi[def.arg];
                if (argc !== undefined) {
                    t.addRow (printhdr, '['+argc+']', def.arg, txt);
                }
                else {
                    t.addRow (printhdr, "", def.arg, txt);
                }
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
                echo (t.format());
                print ($textformat(def.helptext));
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
        print ($textformat (def.text));
    }
}

setapi.textformat = $textformat;

module.exports = setapi;
