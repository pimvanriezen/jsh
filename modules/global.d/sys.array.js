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

Object.defineProperty (Array.prototype, 'sum', {
    value: function() {
        var res = 0;
        for (var i=0; i<this.length; ++i) res += parseFloat(this[i]);
        return res;
    }
});

Object.defineProperty (Array.prototype, 'cut', {
    value: function(field,sep) {
        var res = [];
        for (var i in this) {
            var ln = this[i];
            if (typeof(ln)!="string") ln = ""+ln;
            res.push (ln.cut (field,sep));
        }
        return res;
    }
});

Object.defineProperty (Array.prototype, 'grep', {
    value: function(re,srch,repl) {
        if (typeof (re) == "string") re = new RegExp (re);
        if (typeof (srch) == "string") srch = new RegExp (srch, 'g');
        var res = [];
        for (var i in this) {
            var ln = this[i];
            if (typeof(ln) != "string") ln = ""+ln;
            if (ln.match (re)) {
                if (! srch) res.push (ln);
                else res.push (ln (srch, repl?repl:""));
            }
        }
        return res;
    }
});
