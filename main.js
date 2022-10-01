'use strict';
const fsP = require('fs').promises;
const parseXML = require('./lib/parseXML');
const arrange = require('./lib/arrange');
const mkdir = path => fsP.mkdir(path, {recursive: true});

(async () => {
	let UpdateDate, dict = [];
	console.time("mojLawSplit");

	console.log("Deleting old files");
	for(let folder of [
		"xml/FalVMingLing", "xml/Eng_FalVMingLing",
		"json/FalVMingLing", "json/Eng_FalVMingLing",
		"json_split/ch", "json_split/en",
		"json_arrange/ch", "json_arrange/en"
	]) await fsP.rm(`./${folder}`, {force: true, recursive: true});
	console.timeLog("mojLawSplit");

	/**
	 * Old XML
	 */
	for(let source of ["FalVMingLing", "Eng_FalVMingLing"]) {
		await mkdir(`./xml/${source}`);
		await mkdir(`./json/${source}`);

		console.log(`Opening ${source}.xml`);
		const xml = (await fsP.readFile(`./source/${source}.xml`, 'utf8')).trim();
		if(!UpdateDate) {
			let [, year, month, date] = xml.match(/\sUpdateDate="(\d{4})\/(\d{1,2})\/(\d{1,2}) /);
			UpdateDate = year + (month.length > 1 ? month : ("0" + month)) + (date.length > 1 ? date : ("0" + date));
			console.log("UpdateDate " + UpdateDate);
			await fsP.writeFile("./xml/UpdateDate.txt", UpdateDate);
		}

		process.stdout.write('Parsing');
		const laws = xml.split(/<\/?法規>/).filter((x, i) => i % 2);
		for(let i = 0; i < laws.length; ++i) {
			const law = "<法規>"
				+ laws[i].replace(/\r\n    ( *)</g, '\r\n$1<').trimEnd()
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
			if(!(i % 50)) process.stdout.write(".");
		}
		process.stdout.write("\n");
	}
	await fsP.writeFile("./json/index.json", "[\n" + dict.map(law => JSON.stringify(law)).join(",\n") + "\n]\n");
	await fsP.writeFile("./xml/index.xml",
		`<LAWS UpdateDate="${UpdateDate}">\n`
		+ dict.map(law => {
			let xml = `<LAW PCode="${law.PCode}" name="${law.name}" lastUpdate="${law.lastUpdate}"`;
			if(law.english) xml += ` english="${law.english}"`;
			return xml + "/>";
		}).join("\n")
		+ "\n</LAWS>\n"
	);

	console.timeLog("mojLawSplit");

	/**
	 * New JSON
	 */
	for(let folder of ["split/ch", "split/en", "arrange/ch", "arrange/en"])
		await mkdir(`./json_${folder}`);

	UpdateDate = null;
	dict = {ch: {}, en: {}};
	for(let file of ["ChLaw", "ChOrder", "EnLaw", "EnOrder"]) {
		const lang = file.substring(0, 2).toLowerCase();
		console.log(`Opening ${file}.json`);
		let json = await fsP.readFile(`./source/${file}.json`, 'utf8');
		json = JSON.parse(json.trim()); /// remove BOM
		if(!UpdateDate) {
			let [, year, month, date] = json.UpdateDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}) /);
			UpdateDate = year + (month.length > 1 ? month : ("0" + month)) + (date.length > 1 ? date : ("0" + date));
			console.log("UpdateDate " + UpdateDate);
			await fsP.writeFile("./json_split/UpdateDate.txt", UpdateDate);
			await fsP.writeFile("./json_arrange/UpdateDate.txt", UpdateDate);
		}

		json = json.Laws;
		let law, i = 0;
		process.stdout.write("Parsing");
		while(law = json.pop()) {
			const pcode = (law.LawURL || law.EngLawURL).slice(-8);
			const path = `${lang}/${pcode}.json`;

			await fsP.writeFile(`./json_split/${path}`, JSON.stringify(law, null, "  "));
			const arranged = arrange(law);
			await fsP.writeFile(`./json_arrange/${path}`, JSON.stringify(arranged, null, "\t"));

			if(law.LawURL) dict.ch[pcode] = law.LawName;
			else dict.en[pcode] = law.EngLawName;
			if(!(++i % 50)) process.stdout.write(".");
		}
		process.stdout.write("\n");
	}
	console.log("Saving summary");
	for(let lang of ["ch", "en"]) {
		const json = JSON.stringify(dict[lang], null, "\0");
		await fsP.writeFile(`./json_split/${lang}/index.json`, json);
		await fsP.writeFile(`./json_arrange/${lang}/index.json`, json);
	}

	console.timeEnd("mojLawSplit");
})();
