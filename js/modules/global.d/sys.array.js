// ============================================================================
// Extensions to the Array class
// ============================================================================
Array.help = function() {
    print (setapi.textformat (<<<
        The following extra functions have been added to the Array
        class prototype. Type help(Array.function) for more specific
        information.
        
        Available functions on constructed objects:
    >>>));
    
    var list = [];
    for (i in Array) {
        if (Array[i].help) list.push("Array."+i);
    }
    
    print (new AutoColumn().setData(list).indent(4).format());
}

setapi (Array, "Array");

// ============================================================================
// Array::contains
// ============================================================================
Object.defineProperty (Array.prototype, 'contains', {
    value: function(id) { return this.indexOf(id)>=0; }
});

Array.contains = {help:function() {
    setapi.helptext ({
        name:"array.contains",
        args:[
            {name:"value",text:"The value to look for"}
        ],
        text:<<<
            Returns true if the provided value is contained within
            the array.
        >>>
    });
}}

setapi (Array.contains, "Array.contains");

// ============================================================================
// Array::remove
// ============================================================================
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

Array.remove = {help:function() {
    setapi.helptext ({
        name:"array.remove",
        args:[
            {name:"match",text:<<<
                Either a string that should be removed from the array,
                or an index.
            >>>}
        ],
        text:<<<
            Removes an element from the array, modifying it.
        >>>
    });
}}

setapi (Array.remove, "Array.remove");

// ============================================================================
// Array::sum
// ============================================================================
Object.defineProperty (Array.prototype, 'sum', {
    value: function() {
        var res = 0;
        for (var i=0; i<this.length; ++i) res += parseFloat(this[i]);
        return res;
    }
});

Array.sum = {help:function() {
    setapi.helptext ({
        name:"array.sum",
        text:<<<
            Returns the sum of all elements in the array, provided
            they can be parsed as numbers. Will return NaN if not.
        >>>
    });
}}

setapi (Array.sum, "Array.sum");

// ============================================================================
// Array::cut
// ============================================================================
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

Array.cut = {help:function() {
    setapi.helptext ({
        name:"array.cut",
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
            Cuts a specific field out of each string in the array. Returns
            an array with the transformation applied.
        >>>
    });
}}

setapi (Array.cut,"Array.cut");

// ============================================================================
// Array::grep
// ============================================================================
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

Array.grep = {help:function() {
    setapi.helptext ({
        name:"array.grep",
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
            Given the array contains a list of strings, a new array
            is returned with only the strings matching the pattern,
            with transformation optionally applied.
        >>>
    })
}}

setapi (Array.grep,"Array.grep");

// ============================================================================
// Array::intern
// ============================================================================
Object.defineProperty (Array.prototype, 'intern', {
    value: function(obj) {
        if (obj === null || typeof(obj) != "object") {
            this.push(obj);
            return this;
        }
        if (Array.isArray (obj)) {
            for (var i=0; i<obj.length; ++i) this.push (obj[i]);
            return this;
        }
        for (var k in obj) {
            var nelm = {id:k};
            if (obj[k] === null || typeof(obj[k]) != "object") {
                nelm.value = obj[k];
                this.push (nelm);
                continue;
            }
            for (var subk in obj[k]) {
                var o = obj[k][subk];
                if (subk == "id") {
                    if (o != k) {
                        if (! obj[k].orig_id) nelm.orig_id = o;
                        else if (! obj[k]._id) nelm._id = o;
                        else throw new Error ("could not stash id");
                    }
                    continue ;
                }
                nelm[subk] = o;
            }
            this.push (nelm);
        }
        return this;
    }
});

Array.intern = {help:function() {
    setapi.helptext ({
        name:"array.intern",
        args:[
            {name:"obj",text:<<<
                The object to intern. If it's a primitive, it will
                just be pushed into the array. If it is an array,
                all its elements will be added as new elements in
                the target array. If it's an object, each of its
                keys will be added as a row with an object. If their
                value is an object, its members will be merged into
                that row, otherwise they will be stashed in
                row[n].value.
            >>>},
        ],
        text:<<<
            Interns a given argument into an already created array.
            Returns a reference to the array itself (not a new copy).
        >>>
    })
}}

setapi (Array.intern,"Array.intern");
