var fs = require("fs");
var util = require("util");

function mkdir(dir) {
	var chunks = dir.split("/");
	for(var i = 1; i <= chunks.length; ++i) {
		var cur = chunks.slice(0, i).join("/");
		try { fs.statSync(cur); }
		catch(err) {
			if(err.code == "ENOENT") fs.mkdirSync(cur);
			else throw err;
		}
	}
}

var files = fs.readdirSync("./source");
if(!files.length) throw new Error("No files in `source` directory.");

for(var i = 0; i < files.length; ++i) {
	var s = files[i].split(".");
	if(s.length != 2 || s[1] != "xml") continue;

	console.log("Opening `%s`", files[i]);
	var data = fs.readFileSync("./source/" + files[i], "utf8");
	var frags = data.split(/<\/?法規>/);
	var update = frags[0].match(/UpdateDate="(\d+)"/)[1];

	fs.writeFileSync("UpdateDate.txt", update);
	console.log("UpdateDate: %s", update);

	for(var j = 1; j < frags.length; j+= 2) {
		if((j % 100) == 1) process.stdout.write(".");
		var filename, dir;
		var xml = "<法規>"
			+ frags[j].replace(/\r\n    ( *)</g, "\r\n$1<")
			+ "</法規>\r\n"
		;
		if(/<異動日期>(\d+)<\/異動日期>/.test(xml)) {
			var m = xml.match(/PCODE=(\w+)&LNNDATE=(\d+)&LSER=(\d+)/);
			filename = util.format("HisMingLing/%s/%s_%s.xml", m[1], m[2], m[3]);
			dir = "HisMingLing/" + m[1];
		}
		else {
			var lang = (xml.indexOf("<中文法規名稱>") > -1) ? "Eng_" : "";
			var type = (xml.indexOf("<法規性質>命令</法規性質>") > -1) ? "MingLing": "FalV";
			var pcode = xml.match(/PCODE=(\w+)/)[1];
			filename = util.format("%s%s/%s.xml", lang, type, pcode);
			dir = lang + type;
		}
		mkdir("./xml/" + dir);
		fs.writeFileSync("./xml/" + filename, xml);
	}
	console.log("\r\n%d laws parsed.", (frags.length - 1) / 2);
}
