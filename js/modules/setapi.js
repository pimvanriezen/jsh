// ============================================================================
// API for interacting with unix tools
// ============================================================================

var $apidb = {};
var $textformat = function(txt,width) {
    if (! txt) return "";
    if (! width) width = sys.winsize()-1;
    return TextTable.colorize (txt.rewrap(width));
}

sys.help = function() {
    help(1);
}

// ============================================================================
// FUNCTION help
// -------------
// If an argument is provided, and it isn't a number, see if we can resolve
// a "help" property for it, if so, call it.
// 
// If the argument _is_ a number, and it is higher than zero, show the help
// index for the sys.* functions. As seen above, this magic is normally
// performed by the sys.help() function, which gets called if you call
// help(sys). Still with us?
//
// If no argument is provided, a help index is generated for the user level
// functions that were documented.
// ============================================================================
help = function(helpfor) {
    var helplevel = 0;
    if (typeof (helpfor) != "number") {
        if (helpfor && helpfor.help) return helpfor.help();
        if (helpfor) {
            print ($textformat(<<<`
                No help available: The object provided has no .help() function
                implemented.
            `>>>));
            return;
        }
    }
    
    if (helpfor > 0) helplevel = helpfor;
    
    var helpstr = <<<`
        These are the user level functions. You can
        call help(sys) to show a list of documented system functions.
    `>>>;
    if (helplevel) helpstr = <<<`
        These are the system level functions. Many of them will have been
        wrapped in a more elegant API at the user level.
    `>>>;
    
    print ($textformat(<<<`
        Call help(command) with a function from this list to check for its
        syntax. ${helpstr}
        
        Documented functions:
    `>>>));
        
    var list = [];
    var classlist = [];
    var row = 0;
    for (var k in $apidb) {
        if ((!helplevel) && k.startsWith("sys.")) continue;
        else if (helplevel && (! k.startsWith("sys."))) continue;
        if ((k[0] != '$') && k[0] == k[0].toUpperCase()) classlist.push(k);
        else list.push(k);
    }
    list.sort();

    print (new TextGrid().setData(list).indent(4).minWidth(16).format());
    if (classlist.length) {
        classlist.sort();
        echo ("");
        echo ("Documented classes:");
        print (new TextGrid().setData(classlist).
                                indent(4).minWidth(16).format());
    }
}

// ============================================================================
// FUNCTION setapi
// ---------------
// Generates a function object that wraps a command line tool, which includes
// a generated help() function describing the possible arguments.
// ============================================================================
var setapi = function(arg1,arg2) {
    // Divert if called for just adding a function to the document
    // database
    if (typeof (arg1) == "function") {
        if (typeof (arg1.help) == "function") {
            $apidb[arg2] = true;
            return;
        }
    }
    
    // Regular call, with an array containing the function definition
    var defarr = arg1;
    var apitype="unix";
    var f = null;
    var processf = null;
    
    // Go over the definition once, and fish out the function name to
    // register, as well as an execution function (f) or a result-
    // processing function (process).
    for (var k in defarr) {
        if (defarr[k].name) {
            $apidb[defarr[k].name] = true;
        }
        if (defarr[k].process) processf = defarr[k].process;
        if (defarr[k].f && !defarr[k].opt) f=defarr[k].f;
    }

    // The actual function that will be returned
    var obj = function() {
        var useconsole = false;
        var stdin = null;
        var argp = 0;
        var args = {};
        var lastp = arguments.length;
        
        // If we got any arguments, and the last one contains an
        // object, this is taken to contain the optional
        // arguments. We will parse the rest of the arguments
        // into this as needed.
        if (lastp) {
            var last = arguments[lastp-1];
            if (typeof (last) == "object") {
                args = last;
                lastp--;
            }
        }
        
        // This will contain the argument list as it is sent to the child
        var argv = [];
        
        // Go over the definition
        for (var ai in defarr) {
            var def = defarr[ai];
            
            // Set console option
            if (def.console) {
                useconsole = true;
            }
            
            // {setarg:"foo"} takes the next regular argument
            // provided and stashes it into args.foo
            if (def.setarg) {
                if (argp < lastp) {
                    args[def.setarg] = arguments[argp++];
                }
            }
            
            // {literal:"bar"} adds a literal argument to argv[].
            // {literal:function(){...}} uses the result of the
            // function.
            if (def.literal) {
                if (typeof (def.literal) == "function") {
                    var dt = def.literal(args);
                    if (dt.constructor == Array) {
                        for (var dti in dt) argv.push (dt[dti]);
                    }
                    else if (dt !== undefined) argv.push (dt);
                }
                else argv.push (def.literal);
                continue;
            }
            
            // {opt:{"wibble":"-f"}} adds ["-f",argv.wibble] to argv[]
            // The flag value can be an array, or a function that
            // returns either an array or a single value.
            // In all cases, except for the function, the option-value
            // is added as an argv-argument as well.
            //
            // Also allow an alternative format:
            // {opt:"wibble",prepend:"-f"}, or
            // {opt:"wibble",f:function(args){...}}
            if (def.opt) {
                var dopt = def.opt;
                if (typeof (dopt) == "string") {
                    dopt = {};
                    if (def.f) dopt[def.opt] = def.f
                    else dopt[def.opt] = def.prepend;
                }
                for (var k in args) {
                    if (dopt[k]) {
                        var val = dopt[k];
                        if (typeof (val) == "string") {
                            argv.push (val);
                            argv.push (args[k]);
                        }
                        else if (typeof (val) == "function") {
                            var tval = val(args);
                            if (tval) {
                                argv.intern (tval);
                            }
                        }
                        else {
                            for (var i in val) {
                                argv.push (val[i]);
                            }
                            argv.push (args[k]);
                        }
                    }
                }
                continue;
            }
            
            // {arg:"foo"} adds args.foo to argv[]. If args.foo is
            // not set, this will lead to complaints, unless if the
            // optional flag is set, e.g.,
            // {arg:"foo",optional:true}
            if (def.arg) {
                if (args[def.arg] == undefined) {
                    if (def.def) args[def.arg] = def.def;
                    else if (! def.optional) {
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
                else if (def.unglob) {
                    var matches = sys.glob (args[def.arg]);
                    if (! matches.length) {
                        printerr ("Wildcard doesn't match any files: "+def.arg);
                        return null;
                    }
                    for (var ii=0; ii<matches.length; ++ii) {
                        argv.push (matches[ii]);
                    }
                }
                else argv.push (""+args[def.arg]);
                continue;
            }
            
            // {flag:{"dofoo","-d"}} will add ["-d"] to argv[] if
            // args.dofoo is true.
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
            if (globalThis.DEBUGAPI) dump(argv);
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
        if (processf) res = processf (res, args);
        return res;
    }
    
    // Hidden sub-function, derives the unix command being spawned, if any.
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
    
    // Hidden sub-function, prints out the help page for the function.
    obj.help = function() {
        var t = new TextTable(4);
        var argi = {}
        t.boldColumn(2);
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
            else if (def.silentopt | def.opt || def.flag) {
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
                var dopt = def.opt;
                if (typeof (dopt) == "string") {
                    dopt = {};
                    if (def.f) dopt[def.opt] = def.f
                    else dopt[def.opt] = def.prepend;
                }
                for (var oi in dopt) {
                    var txt = def.helptext;
                    if (!txt) txt = "Option";
                    t.addRow (printhdr,"",oi,txt);
                    printhdr = "";
                }
            }
            else if (def.silentopt) {
                var txt = def.helptext;
                if (!txt) txt = "Option";
                t.addRow (printhdr,"",def.silentopt,txt);
                printhdr = "";
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

setapi.textformat = $textformat;

// ============================================================================
// FUNCTION setapi.helptext
// ------------------------
// For functions that don't wrap a command line tool, this function prints out
// a help-text like that of a function generated by setapi().
// ============================================================================
setapi.helptext = function(def) {
    var t = new TextTable(4);
    t.boldColumn (2);
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
            t.addRow (ttxt, "", def.opts[oi].name, def.opts[oi].text);
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
