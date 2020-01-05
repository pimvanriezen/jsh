var db = new SQLite("example.db");
db.defineTable ("runlog",{
    id:"+",
    ts:"text",
    event:"text"
});

db.insert ("runlog", {
    ts:new Date().toString(),
    event:"Script run"
});

db.display ("runlog");
