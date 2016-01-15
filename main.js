var fs = require("fs");
var util = require("util");

fs.readdir("./source", function(err, files) {
	if(err || !files.length) {
		console.error("Error on reading the `source` directory.");
		return;
	}
	fs.mkdir("HisMingLing", function(err) {
		if(err && err.code != "EEXIST") throw err;
		setImmediate(parseFile, 0);
	});

	function parseFile(index) {
		if(index >= files.length) return;
		var s = files[index].split(".");
		if(s.length != 2 || s[1] != "xml") {
			setImmediate(parseFile, index + 1);
			return;
		}
		console.log("Opening `%s`", files[index]);
		fs.readFile("./source/" + files[index], "utf8", function(err, data) {
			if(err) throw err;
			console.log("File opened.");
			var frags = data.split(/<\/?法規>/);

			var update = frags[0].match(/UpdateDate="(\d+)"/)[1];
			fs.writeFile("UpdateDate.txt", update, function(err) {
				console.log("UpdateDate: %s", update);
			});

			var laws = [];
			for(var j = 1; j < frags.length; j += 2)
				laws.push(frags[j]);

			parseLaws(laws, function() {
				parseFile(index + 1);
			});
		})
	}
});

function parseLaws(xmlArr, callback) {
	console.log("Parsing %d laws.", xmlArr.length);

	function parseLaw(index) {
		if(index >= xmlArr.length) {
			console.log("\r\n%d laws parsed.", xmlArr.length);
			setImmediate(callback);
			return;
		}
		if(index && !(index % 100)) process.stdout.write(".");
		var dir, filename;
		var xml = "<法規>"
			+ xmlArr[index].replace(/\r\n    ( *)</g, "\r\n$1<")
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

		fs.mkdir(dir, function(err) {
			if(err && err.code != "EEXIST") throw err;
			fs.writeFile(filename, xml, function(err) {
				setImmediate(parseLaw, index + 1);
			});
		});
	}
	parseLaw(0);
}
