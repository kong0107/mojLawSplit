const fsP = require("fs").promises;
const download = require("./lib/download");
const parseXML = require("./lib/parseXML");
const arrange = require("./lib/arrange");

const config = [
	{
		title: "old XML",
		sources: {
			"Eng_FalVMingLing.xml": "https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM",
			"FalVMingLing.xml": "https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM"
		},
		gits: ["xml", "json"],
		outputs: [
			"xml/FalVMingLing", "xml/Eng_FalVMingLing",
			"json/FalVMingLing", "json/Eng_FalVMingLing"
		],
		localDates: ["xml/UpdateDate.txt", "json/UpdateDate.txt"],
		dict: []
	},
	{
		title: "new JSON",
		sources: {
			"ChLaw.json": "https://law.moj.gov.tw/api/Ch/Law/JSON",
			"ChOrder.json": "https://law.moj.gov.tw/api/Ch/Order/JSON",
			"EnLaw.json": "https://law.moj.gov.tw/api/En/Law/JSON",
			"EnOrder.json": "https://law.moj.gov.tw/api/En/Order/JSON"
		},
		gits: ["json_split", "json_arrange"],
		outputs: [
			"json_split/ch", "json_split/en",
			"json_arrange/ch", "json_arrange/en"
		],
		localDates: ["json_split/UpdateDate.txt", "json_arrange/UpdateDate.txt"],
		dict: {ch: {}, en: {}}
	}
];

(async() => {
	const gits = [];
	let batch = "";

	for(let isNew = 0; isNew < config.length; ++isNew) {
		const c = config[isNew];
		let localDate, remoteDate;
		const dict = c.dict;

		try {
			localDate = await fsP.readFile(c.localDates[0], "utf8");
		} catch(e) {}

		const files = Object.keys(c.sources);
		for(let i = 0; i < files.length; ++i) {
			const url = c.sources[files[i]];
			await download(url, __dirname + "/source/");
			const text = (await fsP.readFile(`./source/${files[i]}`, "utf8")).trim().replaceAll("\x00", ""); /// removes BOM; removes null characters in D0070001 §62 (XML only)
			if(!remoteDate) {
				let [, year, month, date] = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
				remoteDate = year + (month > 9 ? month : "0" + month) + (date > 9 ? date : "0" + date);
				if(remoteDate === localDate) {
					console.log(`${c.title} has not updated yet. Now version ${localDate}.`);
					break; //!!!
				}
				for(let folder of c.outputs) {
					await fsP.rm(folder, {force: true, recursive: true});
					await fsP.mkdir(folder, {recursive: true});
				}
				console.log(`Updating ${c.title} to ${remoteDate}.`);
			}

			process.stdout.write("Parsing");
			if(isNew) {
				const lang = files[i].substring(0, 2).toLowerCase();
				const laws = JSON.parse(text).Laws;
				let law, j = 0;
				while(law = laws.pop()) {
					const pcode = (law.LawURL || law.EngLawURL).slice(-8);
					const path = `${lang}/${pcode}.json`;

					await fsP.writeFile(`./json_split/${path}`, JSON.stringify(law, null, "  "));
					const arranged = arrange(law);
					await fsP.writeFile(`./json_arrange/${path}`, JSON.stringify(arranged, null, "\t"));

					if(law.LawURL) dict.ch[pcode] = law.LawName;
					else dict.en[pcode] = law.EngLawName;
					if(!(++j % 50)) process.stdout.write(".");
				}
				process.stdout.write("\n");
			}
			else {
				const [source] = files[i].split(".");
				const laws = text.split(/<\/?法規>/).filter((x, j) => j % 2);
				for(let j = 0; j < laws.length; ++j) {
					const law = "<法規>"
						+ laws[j].replace(/\r\n    ( *)</g, "\r\n$1<").trimEnd()
						+ "\r\n</法規>\r\n"
					;
					const [, pcode] = law.match(/\?pcode=([A-Z]\d{7})/);
					await fsP.writeFile(`./xml/${source}/${pcode}.xml`, law);

					const obj = await parseXML(law);
					await fsP.writeFile(`./json/${source}/${pcode}.json`, JSON.stringify(obj, null, "\t"));

					if(source === "FalVMingLing") {
						const brief = {
							PCode: pcode,
							name: obj["法規名稱"],
							lastUpdate: obj["最新異動日期"]
						};
						if(obj["英文法規名稱"]) brief.english = obj["英文法規名稱"];
						dict.push(brief);
					}
					if(!(j % 50)) process.stdout.write(".");
				}
				process.stdout.write("\n");
			}
		}

		if(remoteDate === localDate) continue;
		for(let file of c.localDates) await fsP.writeFile(file, remoteDate);
		for(let folder of c.gits) {
			const ext = isNew ? (folder === "json_split" ? "_swagger" : "_arrange") : "";
			batch += [
				"",
				`cd ${folder}`,
				"git add .",
				`git commit -m "UpdateDate ${remoteDate}"`,
				`git tag ${remoteDate}${ext}`,
				"git push",
				"git push --tags",
				"cd ..",
				""
			].join("\n");
		}

		if(isNew) {
			for(let lang in dict) {
				const json = JSON.stringify(dict[lang], null, "\0");
				await fsP.writeFile(`./json_split/${lang}/index.json`, json);
				await fsP.writeFile(`./json_arrange/${lang}/index.json`, json);
			}
			gits.push("json_split", "json_arrange");
		}
		else {
			await fsP.writeFile("./json/index.json", "[\n" + dict.map(law => JSON.stringify(law)).join(",\n") + "\n]\n");
			await fsP.writeFile("./xml/index.xml",
				`<LAWS UpdateDate="${remoteDate}">\n`
				+ dict.map(law => {
					let xml = `<LAW PCode="${law.PCode}" name="${law.name}" lastUpdate="${law.lastUpdate}"`;
					if(law.english) xml += ` english="${law.english}"`;
					return xml + "/>";
				}).join("\n")
				+ "\n</LAWS>\n"
			);
			gits.push("xml", "json");
		}
		delete c.dict; // release memory
	}
	fsP.unlink("./source/schema.csv");
	fsP.unlink("./source/manifest.csv");

	if(!batch) {
		console.log("No updates to push.");
		batch += "echo \"No updates to push.\"";
	}
	batch = `@echo off\n${batch}\npause\n@echo on`;
	await fsP.writeFile("./gitPush.bat", batch);
})();
