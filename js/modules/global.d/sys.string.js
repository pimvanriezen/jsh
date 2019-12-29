// ============================================================================
// Augmentations for the string class
// ============================================================================
String.help = function() {
    print (setapi.textformat (<<<
        The following extra functions have been added to the String
        class prototype. Type help(String.function) for a more
        specific list.
        
        Available functions on constructed objects:
    >>>));
    
    var list = [];
    for (i in String) {
        if (String[i].help) list.push("String."+i);
    }
    
    print (new TextGrid().setData(list).indent(4).format());
}

setapi (String, "String");

// ============================================================================
// String::padStart
// ============================================================================
String::padStart = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = c+res;
    return res;
}

String.padStart = {help:function() {
    setapi.helptext ({
        name:"string.padStart",
        args:[
            {name:"length",text:"Length to pad the string to"},
            {name:"char",text:"[Optional] Character to use for padding"},
        ],
        text:<<<
            Cuts the string to an exact length. If the string is shorter
            than the length provided, it is padded from the left with
            spaces (or the provided character). The newly built String
            is returned, and the original is left untouched.
        >>>
    });
}}

setapi (String.padStart, "String.padStart");

// ============================================================================
// String::padEnd
// ============================================================================
String::padEnd = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = res+c;
    return res;
}

String.padEnd = {help:function() {
    setapi.helptext ({
        name:"string.padEnd",
        args:[
            {name:"length",text:"Length to pad the string to"},
            {name:"char",text:"[Optional] Character to use for padding"},
        ],
        text:<<<
            Cuts the string to an exact length. If the string is shorter
            than the length provided, it is padded at the right side with
            spaces (or the provided character). The newly built String
            is returned, and the original is left untouched.
        >>>
    });
}}

setapi (String.padEnd, "String.padEnd");

// ============================================================================
// String::save
// ============================================================================
String::save = function(path) {
    sys.write (""+this, ""+path);
}

String.save = {help:function() {
    setapi.helptext ({
        name:"string.save",
        args:[
            {name:"path",text:"Path and filename to save to."}
        ],
        text:<<<
            Writes a string to disk.
        >>>
    })
}}

setapi (String.save, "String.save");

// ============================================================================
// String::summarize
// ============================================================================
String::summarize = function(sz) {
    if (this.length <= sz) return this.toString();
    if (sz < 11) return this.toString();
    var res = "";
    var dsz = sz - "...".length;
    var halfsz = Math.floor(dsz/2);
    var restsz = dsz-halfsz;
    res = this.substr(0,halfsz) + "..." +
          this.substr(this.length-restsz);
    return res;
}

String.summarize = {help:function() {
    setapi.helptext ({
        name:"string.summarize",
        args:[
            {name:"width",text:"Maximum width of the string."}
        ],
        text:<<<
            Shortens a string if it exceeds a certain width, taking
            even ends from the left and the right, with an ellipsis
            in the middle representing the excess characters.
        >>>
    })
}}

setapi (String.summarize, "String.summarize");

// ============================================================================
// String::grep
// ============================================================================
String::grep = function(re,srch,repl) {
    return this.split('\n').grep (re,srch,repl);
}

String.grep = {help:function() {
    setapi.helptext ({
        name:"string.grep",
        args:[
            {name:"pattern",text:<<<
                Regular expression pattern to match lines against.
            >>>},
            {name:"process",text:<<<
                [Optional] Regular expression pattern that will
                be applied to a matchine line, and either deleted
                or replaced with the third argument.
            >>>},
            {name:"replace",text:<<<
                Replacement string for processing
            >>>}
        ],
        text:<<<
            Splits a string up by newlines, then pulls them through
            Array.grep() to yield an array of processed lines
            matching the given pattern.
        >>>
    })
}}

setapi (String.grep, "String.grep");

// ============================================================================
// String::wrap
// ============================================================================
String::wrap = function (cols) {
    var str = ""+this;
    var words = str.split (' ');
    var ln = "";
    var res = [];
    while (words.length) {
        if (ln.length + words[0].length + 1 > cols) {
            res.push (ln);
            ln = words.splice(0,1)[0];
        }
        else {
            ln = (ln?ln + ' ':'') + words.splice(0,1)[0];
        }
    }
    if (ln.length) res.push (ln);
    return res.join('\n');
}

String.wrap = {help:function() {
    setapi.helptext ({
        name:"string.wrap",
        args:[
            {name:"width",text:"Maximum width of text lines."}
        ],
        text:<<<
            Returns a word-wrapped version of the string, with newlines
            added for every time a line would exceed the width.
        >>>
    })
}}

setapi (String.wrap, "String.wrap");

// ============================================================================
// String::cut
// ============================================================================
String::cut = function (field, sep) {
    if (! sep) sep = /[ \t]+/;
    var splt = this.split (sep);
    var len = splt.length;
    if (field<0) field = len+field;
    if (field<0 || field>=len) return "";
    return splt[field];
}

String.cut = {help:function() {
    setapi.helptext ({
        name:"string.cut",
        args:[
            {name:"index",text:<<<
                The field to cut out, indexing starts at 0. If the field
                provided is negative, it is counted from the right, with
                -1 being the last field.
            >>>},
            {name:"delimiter",text:<<<
                Character or regular expression pattern to use as a means
                of splitting up the string. If this argument is left out,
                it defaults to splitting on arbitrary amounts of white
                space.
            >>>}
        ],
        text:<<<
            Cuts a specific field out of a string that can reasonably
            be split up by some kind of delimiter.
        >>>
    });
}}

setapi (String.cut, "String.cut");

// ============================================================================
// String::rewrap
// ============================================================================
String::rewrap = function (cols) {
    var res = "";
    var str = ""+this;
    var paragraphs = str.split ("\n\n");
    for (var k in paragraphs) {
        var p = (""+paragraphs[k]).split("\n").join(" ");
        p = p.wrap(cols);
        paragraphs[k] = p;
    }
    res = paragraphs.join("\n\n") + '\n';
    if (res.endsWith("\n\n")) {
        res = res.substr (0,res.length-1);
    }
    return res;   
}

String.rewrap = {help:function() {
    setapi.helptext ({
        name:"string.rewrap",
        args:[
            {name:"width",text:"New maximum line width"}
        ],
        text:<<<
            Transforms text that has potentially already been wrapped,
            splits it up into paragraphs, and word-wraps each paragraph
            to the desired line length. Paragraphs should have an empty
            line between them for this to work.
        >>>
    })
}}

setapi (String.rewrap, "String.rewrap");

// ============================================================================
// String::colorMatch
// ============================================================================
String::colorMatch = function (expr, code) {
    var ansi = code;
    var re = expr;
    if (typeof (re) == "string") {
        re = new RegExp (expr, "g");
    }
    if (typeof (code) == "number") {
        ansi = '\033[' + code + 'm';
    }
    var decor = function (match) {
        return ansi + match + '\033[0m';
    }
    
    return this.replace (re, decor);
}

