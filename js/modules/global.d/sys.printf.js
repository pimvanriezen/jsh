// ============================================================================
// FUNCTION printf
// ============================================================================
var printf = function() {
    print (sprintf.apply (null, arguments));
}

// ============================================================================
// DOCUMENTATION
// ============================================================================
#ifdef IS_INTERACTIVE
printf.help = function() {
    setapi.helptext ({
        name:"printf",
        args:[
            {name:"fmt",text:<<<`
                Format string. Extra arguments after the format string
                are used to fill in the blanks.
            `>>>}
        ],
        text:<<<`
            C-style printf, prints formatted text to the console. Newlines
            should be provided by the caller as needed. The libc style of
            precision and padding options are recognized. Types are coerced
            if possible, with the following argument types recognized in
            the format string:
        `>>>
    });
    echo ("");
    echo (TextTable.auto(<<<`
        %s      String data
        %S      Also string data, but if a width is provided, the string
                get summarized to that width
        %i/%d   Integer data
        %f      Floating point
        %x      Hexadecimal number
        %j      JSON encoding
        %J      Colorized JSON encoding (for ANSI terminals)
        %%      Prints a percentage mark
    `>>>,2).indent(8).padding(4).boldColumn(0).format());

    print (setapi.textformat (<<<`
        If you want get the formatted string for further processing, rather
        than sending it to the console, call sprintf() with the same
        parameters.
    `>>>));
}

setapi (printf, "printf");
#endif

// ============================================================================
// FUNCTION sprintf
// ============================================================================
var sprintf = function(fmt)
{
    var doPad = function(chr, width, left, str)
    {
        var ret = str;
        while (ret.length < width) {
            if (left) ret += chr;
            else ret = chr + ret;
        }
        return (ret);
    }

	var regex = [
	    '([^%]*)',				/* normal text */
	    '%',				/* start of format */
	    '([\'\\-+ #0]*?)',			/* flags (optional) */
	    '([1-9]\\d*)?',			/* width (optional) */
	    '(\\.([1-9]\\d*))?',		/* precision (optional) */
	    '[lhjztL]*?',			/* length mods (ignored) */
	    '([diouxXfFeEgGaAcCsSp%jJr])'	/* conversion */
	].join('');

	var re = new RegExp(regex);
	var args = Array.prototype.slice.call(arguments, 1);
	var flags, width, precision, conversion;
	var left, pad, sign, arg, match;
	var ret = '';
	var argn = 1;
	var fn = {};

    if (typeof (fmt) != "string") return "";

	while ((match = re.exec(fmt)) !== null) {
		ret += match[1];
		fmt = fmt.substring(match[0].length);

		flags = match[2] || '';
		width = match[3] || 0;
		precision = match[4] || '';
		conversion = match[6];
		left = false;
		sign = false;
		pad = ' ';
		fn = function(x){return x.toString();}

		if (conversion == '%') {
			ret += '%';
			continue;
		}

		if (args.length === 0)
			throw (new Error('too few args to sprintf'));

		arg = args.shift();
		argn++;

		if (flags.match(/[\' #]/))
			throw (new Error(
			    'unsupported flags: ' + flags));

		if (precision.length > 0) {
		    if (precision[0] == '.') precision = precision.substr(1);
		    precision = parseInt (precision);
			fn = function(x) {
			    return parseFloat(x).toFixed(precision);
			}
		}

		if (flags.match(/-/))
			left = true;

		if (flags.match(/0/))
			pad = '0';

		if (flags.match(/\+/))
			sign = true;

		switch (conversion) {
		    case 'S':
		        if (width>8) {
		            arg = arg.toString().summarize(width);
		        }
		        /*jsl:fallthru*/
            case 's':
                if (arg === undefined || arg === null) arg = "<null>";
                ret += doPad(pad, width, left, arg.toString());
                break;

            case 'i':
            case 'd':
                arg = Math.floor(arg);
                /*jsl:fallthru*/
            case 'f':
                sign = sign && arg > 0 ? '+' : '';
                ret += sign + doPad(pad, width, left, fn(arg));
                break;

            case 'x':
                ret += doPad(pad, width, left, arg.toString(16));
                break;
                
            case 'j':
                ret += JSON.stringify(arg);
                break;
            
            case 'J':
                ret += dump.dumper(arg,true);
                break;

            default:
                throw (new Error('unsupported conversion: ' + conversion));
		}
	}

	ret += fmt;
	return (ret);
}
