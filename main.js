'use strict';
const fsP = require('fs').promises;
const xmlSplit = require('./xmlSplit');
const saveSummary = require('./saveSummary');
const mapDict = require('./lib/mapDict');
const parseXML = require('./lib/parseXML');
const getFilePath = require('./lib/getFilePath');
const writeFile = require('./lib/writeFile');
const arrange = require('./lib/arrange');

const mkdir = async (path) => {
	try {
		await fsP.mkdir(path);
	} catch(err) {}
}

(async () => {
	let dict;

	/**
	 * Old XML
	 */
	dict = await xmlSplit();
	await mkdir("./json");
	fsP.copyFile('./xml/UpdateDate.txt', './json/UpdateDate.txt');

	console.log('Converting XML to JSON');
	dict = await mapDict(async (xml, pcode, category, lnndate, lser) => {
		const law = await parseXML(xml);
		const filepath = getFilePath(pcode, category, lnndate, lser) + '.json';
		await writeFile(`./json/${filepath}`, JSON.stringify(law, null, '\t'));
		return law;
	}, dict);
	console.log('All XML converted.');
	await saveSummary(dict);


	/**
	 * New JSON
	 */
	for(let folder of [
		"split", "split/ch", "split/en",
		"arrange", "arrange/ch", "arrange/en"
	]) await mkdir(`./json_${folder}`);

	let UpdateDate;
	dict = {ch: {}, en: {}};
	for(let file of ["ChLaw", "ChOrder", "EnLaw", "EnOrder"]) {
		const lang = file.substring(0, 2).toLowerCase();
		console.log(`Opening ${file}.json`);
		let json = await fsP.readFile(`./source/${file}.json`, 'utf8');
		json = JSON.parse(json.trim()); /// remove BOM
		if(!UpdateDate) {
			const match = json.UpdateDate.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
			console.assert(match);
			UpdateDate = match[1] + (match[2].length > 1 ? match[2] : ("0" + match[2])) + (match[3].length > 1 ? match[3] : ("0" + match[3]));
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
})();
