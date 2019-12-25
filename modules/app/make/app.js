if (which ("make")) {
    var make = setapi ([
        {name:"make"},
        {literal:"make"},
        {opt:{"file":"-f"},helptext:"Use file instead of Makefile"},
        {opt:{"target":[]},helptext:"Build target"},
        {console:true},
        {helptext:"Runs the make build utility."}
    ]);

    module.version = "1.0.0";
    module.exports = make;
}

