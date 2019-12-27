var prompt = function(val) {
    if (val) {
        this.setval = val;
    }
    var fmt = "[%h:%p]%# ";
    if (this.setval) fmt = this.setval;
    fmt = fmt.replace(/%h/,hostname().split('.')[0]);
    fmt = fmt.replace(/%i/,cd.history.length);
    fmt = fmt.replace(/%p/,cwd().summarize (4+(sys.winsize()/2)-fmt.length));
    fmt = fmt.replace(/%#/,sys.getuid()==0 ? "#":":");
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
    echo (texttable.auto(<<<
        %h The hostname
        %p The current working directory (summarized)
        %i The index in the directory history
        %# Prompt character, ":" for users, "#" for root
    >>>,2).boldColumn(0).indent(4).format());
    print (<<<
        You can also override the function completely to write a custom
        prompt, that gets executed every time the shell displays a new
        prompt.
    >>>.rewrap(sys.winsize()));
}

module.version = "1.0.2";
module.exports = prompt;
