var fs = require("fs");
var util = require("util");
var x2j = require("xml2jsobj");

var running = false;
var queue = [];
var dict = {};
var allQueued = false;
var update;

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
	update = frags[0].match(/UpdateDate="(\d+)"/)[1];

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
			var pcode = xml.match(/PCODE=(\w+)/)[1];
			filename = util.format("%sFalVMingLing/%s.xml", lang, pcode);
			dir = lang + 'FalVMingLing';
		}
		mkdir("./xml/" + dir);
		fs.writeFileSync("./xml/" + filename, xml);

		mkdir("./json/" + dir);
		saveAsJSON(xml, "./json/" + filename.replace(".xml", ".json"));
	}
	allQueued = true;
	console.log("\r\n%d laws parsed.", (frags.length - 1) / 2);
}

function saveAsJSON(xml, filename) {
	queue.push({xml: xml, filename: filename});
	if(!running) convert();
}

function convert() {
	if(!queue.length) {
		running = false;
		if(allQueued) outputDict();
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

		//
		// 總匯
		//
		var PCode = law.法規網址.substr(law.法規網址.indexOf('PCODE') + 6, 8);
		if(!dict[PCode]) dict[PCode] = {PCode: PCode};
		if(law.異動日期) {	/// 歷史法規
			if(!dict[PCode].updates) dict[PCode].updates = [];
			dict[PCode].updates.push(law.異動日期);
			if(!dict[PCode].oldNames) dict[PCode].oldNames = [];
			if(dict[PCode].oldNames.indexOf(law.法規名稱) == -1)
				dict[PCode].oldNames.push(law.法規名稱);
		}
		else if(law.中文法規名稱) dict[PCode].english = law.英文法規名稱;
		else {
			dict[PCode].name = law.法規名稱;
			dict[PCode].lastUpdate = law.最新異動日期;
		}

		setImmediate(convert);
	});
}

function outputDict() {
	var result = [];

	var stream = fs.createWriteStream('./xml/index.xml');
	stream.write('<LAWS UpdateDate="' + update + '">');
	for(var PCode in dict) {
		var law = dict[PCode];
		var pos;
		if(law.oldNames && (pos = law.oldNames.indexOf(law.name)) != -1) {
			law.oldNames.splice(pos, 1);
			if(!law.oldNames.length) delete law.oldNames;
		}
		result.push(law);

		var single = true;
		stream.write(util.format(
			'\r\n<LAW PCode="%s" name="%s" lastUpdate="%s"',
			law.PCode, law.name, law.lastUpdate
		));
		if(law.english) stream.write(' english="' + law.english + '"');
		if(law.updates) {
			single = false;
			stream.write('><UPDATES>');
			law.updates.forEach(function(date) {
				stream.write('<DATE>' + date + '</DATE>');
			});
			stream.write('</UPDATES>');
		}
		if(law.oldNames) {
			if(single) {
				single = false;
				stream.write('>');
			}
			stream.write('<HISTORY>');
			law.oldNames.forEach(function(name) {
				stream.write('<NAME>' + name + '</NAME>');
			});
			stream.write('</HISTORY>');
		}
		stream.write(single ? '/>' : '</LAW>');
	}

	stream.end('\r\n</LAWS>\r\n', function(){
		console.log('Written basic info of all into index.xml');
	});
	fs.writeFile('./json/index.json',
		JSON.stringify(result).replace(/{"PCode/g, '\n{"PCode').slice(0, -1) + '\n]\n',
		function() {console.log('Written basic info of all into index.json');}
	);
}
