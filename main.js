var fs = require("fs");
var util = require("util");
var x2j = require("xml2jsobj");

var running = false;
var queue = [];

function mkdir(dir) {
	var chunks = dir.split("/");
	for(var i = 1; i <= chunks.length; ++i) {
		if(chunks[i] == ".") continue;
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

	console.log("UpdateDate: %s", update);
	fs.writeFileSync("./xml/UpdateDate.txt", update);
	fs.writeFileSync("./json/UpdateDate.txt", update);

	for(var j = 1; j < frags.length; j+= 2) {
		if((j % 100) == 1) process.stdout.write(".");
		var filename, dir;
		var xml = "<法規>\r\n"
			+ frags[j].trim()
				.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, "")
				.replace(/\r\n    ( *)</g, "\r\n$1<")
			+ "\r\n</法規>\r\n"
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

		mkdir("./json/" + dir);
		saveAsJSON(xml, "./json/" + filename.replace(".xml", ".json"));
	}
	console.log("\r\n%d laws parsed.", (frags.length - 1) / 2);
}

function saveAsJSON(xml, filename) {
	queue.push({xml: xml, filename: filename});
	if(!running) convert();
}

function convert() {
	if(!queue.length) {
		running = false;
		return;
	}
	running = true;
	var args = queue.shift();
	x2j.convert(args.xml, function(err, result) {
		if(err) throw err;
		var law = {};
		var lawInfo = result.children;
		for(var j = 0; j < lawInfo.length; ++j) {
			var attr = lawInfo[j].name;
			var value = lawInfo[j].children;
			if(!value) continue;
			switch(attr) {
				case "法規內容":
					law[attr] = [];
					for(var k = 0; k < value.length; ++k) {
						var article = value[k];
						switch(article.name) {
							case "編章節":
								if(!article.children) console.error(
									"Warning: 【%s】有空白的編章節",
									law["法規名稱"] || law["中文法規名稱"]
								);
								law[attr].push({"編章節":
									article.children ? article.children[0] : ""
								});
							break;
							case "條文":
								var artCon = {"條號": article.children[0].children[0]};
								if(!article.children[1].children) console.error(
									"Warning: 【%s】%s沒有內容",
									law["法規名稱"] || law["中文法規名稱"],
									(law["異動日期"] || "") + article.children[0].children[0]
								);
								else artCon["條文內容"] = article.children[1].children[0];
								law[attr].push(artCon);
							break;
							default:
								console.error("Unexpected content", article);
						}
					}
				break;
				case "附件":
					law[attr] = [];
					for(var k = 0; k < value.length; ++k) {
						if(value[k].name != "下載網址")
							console.error("Unexpected attachment", value[i]);
						law[attr].push(value[k].children[0]);
					}
				break;
				default:
					var text;
					if(value.length != 1)
						console.error("Unexpected property", lawInfo[j]);
					else if(text = value[0].trim())
						law[attr] = text;
			}
		}
		fs.writeFileSync(args.filename, JSON.stringify(law, null, "\t"));
		convert();
	});
}
