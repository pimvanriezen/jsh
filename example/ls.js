#!./jsh
argv.splice(0,1);
if (! argv.length) ls();
else {
	for (var idx in argv) {
		ls(argv[idx]);
	}
}
