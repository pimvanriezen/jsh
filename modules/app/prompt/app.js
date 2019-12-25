var prompt = function(val) {
    if (val) {
        this.setval = val;
    }
    var fmt = "[%h:%p]%# ";
    if (this.setval) fmt = this.setval;
    fmt = fmt.replace(/%h/,hostname().split('.')[0]);
    fmt = fmt.replace(/%i/,cd.history.length);
    fmt = fmt.replace(/%p/,cwd().summarize (4+(sys.winsize()/2)-fmt.length));
    fmt = fmt.replace(/%#/,sys.getuid()==0 ? "#:":":");
    return fmt;
}

prompt.help = function() {
    setapi.helptext ({
        name:"prompt",
        args:[
            {name:"str",text:"The prompt format string"}
        ],
        text:<<<
            Changes the look of the shell prompt. The format string recognizes
            a couple of substitutions:
        >>>
    });
    echo ("");
    var t = new texttable(2);
    t.addRow ("%h","The hostname");
    t.addRow ("%p","The current working directory");
    t.addRow ("%i","The index in the directory history");
    t.addRow ("%#","An apropriate prompt character (# for root)");
    t.boldColumn(0);
    t.indent(4);
    echo (t.format());
    print (<<<
        You can also override the function completely to write a custom
        prompt, that gets executed every time the shell displays a new
        prompt.
    >>>.rewrap(sys.winsize()));
}

module.version = "1.0.1";
module.exports = prompt;
