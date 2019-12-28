var ps = setapi ([
    {name:"ps"},
    {opt:{command:true},helptext:"Match command against regexp"},
    {opt:{user:true},helptext:"Match user against regexp"},
    {helptext:<<<
        Displays a list of processes, optionally filtered against provided
        match criteria. If you want programmatic access to the process
        list, use sys.ps() or access details through the proc[] object.
    >>>},
    {f:function(args) {
        var listing = sys.ps(args);
        var t = new TextTable(8);
        for (var i in listing) {
            var p = listing[i];
            p.user = p.user.padEnd(8);
            p.vsz = humanSize (p.vsz);
            p.rss = humanSize (p.rss);
            p.command = p.command.replace (/^\/[\/_.0-9a-zA-Z]*\//,"");
            t.addRow(p.user, p.pid, p.pcpu, p.pmem, p.vsz,
                     p.rss, p.time, p.command);
        }
        t.marginRight(0);
        t.rightAlignColumn(1);
        t.rightAlignColumn(2);
        t.rightAlignColumn(3);
        t.rightAlignColumn(4);
        t.rightAlignColumn(5);
        t.rightAlignColumn(6);
        t.noWrap();
        t.boldColumn (1);
        print (t.format());
    }}
]);

module.version = "1.0.0";
module.exports = ps;
