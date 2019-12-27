// ============================================================================
// Augmentations for the string class
// ============================================================================
String.prototype.padStart = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = c+res;
    return res;
}

String.prototype.padEnd = function(len,c) {
    if (c === undefined) c = " ";
    var res = this.slice(0,len);
    if (res.length > len) res.splice (len, res.length-len);
    while (res.length < len) res = res+c;
    return res;
}

String.prototype.save = function(path) {
    sys.write (""+this, ""+path);
}

Object.defineProperty (Array.prototype, 'contains', {
    value: function(id) { return this.indexOf(id)>=0; }
});

Object.defineProperty (Array.prototype, 'remove', {
    value: function(match) {
        if (typeof(match) == "string") {
            var idx = this.indexOf(match);
            while (idx>=0) {
                this.splice (idx,1);
                idx = this.indexOf(match);
            }
        }
        else if (typeof(match) == "number") {
            this.splice (match,1);
        }
    }
});

String.prototype.summarize = function(sz) {
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

String.prototype.grep = function(re,srch,repl) {
    if (typeof (re) == "string") re = new RegExp (re);
    if (typeof (srch) == "string") srch = new RegExp (srch, 'g');
    var res = [];
    var lines = this.split('\n');
    for (var i in lines) {
        if (lines[i].match (re)) {
            if (! srch) res.push (lines[i]);
            else res.push (lines[i].replace (srch, repl?repl:""));
        }
    }
}

String.prototype.wrap = function (cols) {
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
    return res;
}

String.prototype.rewrap = function (cols) {
    var res = "";
    var str = ""+this;
    var paragraphs = str.split ("\n\n");
    for (var k in paragraphs) {
        var p = (""+paragraphs[k]).split("\n").join(" ");
        p = p.wrap(cols).join('\n');
        paragraphs[k] = p;
    }
    res = paragraphs.join("\n\n") + '\n';
    if (res.endsWith("\n\n")) {
        res = res.substr (0,res.length-1);
    }
    return res;   
}

String.prototype.colorMatch = function (expr, code) {
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

module.exports = null;
