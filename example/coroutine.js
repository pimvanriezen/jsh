var numberSumWorker = function (c) {
    var msg;
    while (msg = c.recv()) {
        var sum = 0;
        for (var i in msg) sum += msg[i];
	    c.send (sum);
    }
}

var c = new Channel();
var numbers = [441,755,387,504,154,244,732,245,620,451,58,811,170,878,71,975,
               589,32,86,192,288,36,974,500,878,675,881,657,893,98,472,325,
               589,32,86,192,288,36,974,500,878,675,881,657,893,98,472,325,
               589,32,86,192,288,36,974,500,878,675,881,657,893,98,472,325,
               589,32,86,192,288,36,974,500,878,675,881,657,893,98,472,325];

for (var i=0; i<4; ++i) {
    go (c, numberSumWorker);
}

while (numbers.length) {
    c.send (numbers.splice(0,4));
}

c.exit();

var totalsum = 0;
var m;

while (m = c.recv()) {
    printf ("Received: %J\n", m);
    totalsum += m;
}

echo ("Total sum: "+totalsum);
