/*
 * Adapted from extsprintf.js: extended POSIX-style sprintf
 */

var printf = function() {
    print (sprintf.apply (null, arguments));
}

printf.help = function() {
    setapi.helptext ({
        name:"printf",
        args:[
            {name:"fmt",text:<<<
                Format string. Extra arguments after the format string
                are used to fill in the blanks.
            >>>}
        ],
        text:<<<
            C-style printf, prints formatted text to the console. Newlines
            should be provided by the caller as needed. The libc style of
            precision and padding options are recognized. Types are coerced
            if possible, with the following argument types recognized in
            the format string:
        >>>
    });
    echo ("");
    var t = texttable.auto(<<<
        %s      String data
        %i/%d   Integer data
        %f      Floating point
        %x      Hexadecimal number
    >>>,2);
    t.indent (8);
    t.padding (4);
    t.boldColumn (0);
    echo (t.format());
    print (setapi.textformat (<<<
        If you want get the formatted string for further processing, rather
        than sending it to the console, call sprintf() with the same
        parameters.
    >>>));
}

setapi (printf, "printf");

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
	    '([diouxXfFeEgGaAcCsSp%jr])'	/* conversion */
	].join('');

	var re = new RegExp(regex);
	var args = Array.prototype.slice.call(arguments, 1);
	var flags, width, precision, conversion;
	var left, pad, sign, arg, match;
	var ret = '';
	var argn = 1;

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

		if (precision.length > 0)
			throw (new Error(
			    'non-zero precision not supported'));

		if (flags.match(/-/))
			left = true;

		if (flags.match(/0/))
			pad = '0';

		if (flags.match(/\+/))
			sign = true;

		switch (conversion) {
            case 's':
                if (arg === undefined || arg === null)
                    throw (new Error('argument ' + argn +
                        ': attempted to print undefined or null ' +
                        'as a string'));
                ret += doPad(pad, width, left, arg.toString());
                break;

            case 'i':
            case 'd':
                arg = Math.floor(arg);
                /*jsl:fallthru*/
            case 'f':
                sign = sign && arg > 0 ? '+' : '';
                ret += sign + doPad(pad, width, left, arg.toString());
                break;

            case 'x':
                ret += doPad(pad, width, left, arg.toString(16));
                break;

            default:
                throw (new Error('unsupported conversion: ' + conversion));
		}
	}

	ret += fmt;
	return (ret);
}
