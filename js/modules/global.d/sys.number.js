// ============================================================================
// Extensions to the Number class
// ============================================================================
Number.help = function() {
    print (setapi.textformat (<<<`
        The following extra functions have been added to the Number
        class prototype. Type help(Number.function) for more specific
        information.
        
        Documented methods:
    `>>>));
    
    var list = [];
    for (i in Number.prototype) {
        if (Number.prototype[i].help) list.push("Number::"+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (Number, "Number");

Number::toSize = function () {
    var res = this;
    var factor = "";
    var factors = ["K","M","G","T"];
    for (var i in factors) {
        if (res > 10000) {
            res = res/1024;
            factor = factors[i];
        }
        else break;
    }
    return "" + res.toFixed(0) + factor;
}

Number::toSize.help = function() {
    setapi.helptext ({
        name:"num.toSize",
        text:<<<`
            Converts the number to a size string, moving up an order
            of magnitude on the scale each time the number exceeds
            10000. So (10000).toSize() = "10000", but
            (10001).toSize() = "10K".
        `>>>
    });
}

Number::toHex = function(wid) {
    if (! wid) return this.toString(16);
    return this.toString(16).padStart(wid,'0');
}

Number::toHex.help = function() {
    setapi.helptext ({
        name:"num.toHex",
        args:[
            {name:"width",text:"[Optional] Desired width of the hex string"}
        ],
        text:<<<`
            Converts the humber to a hexidecimal string. Returns said
            string.
        `>>>
    })
}
