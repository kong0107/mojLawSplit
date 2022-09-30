'use strict';
const fsP = require('fs').promises;
const xmlSplit = require('./xmlSplit');
const saveSummary = require('./saveSummary');
const mapDict = require('./lib/mapDict');
const parseXML = require('./lib/parseXML');
const getFilePath = require('./lib/getFilePath');
const writeFile = require('./lib/writeFile');

const mkdir = async (path) => {
	try {
		await fsP.mkdir(path);
	} catch(err) {}
}

(async () => {
	let dict = await xmlSplit();

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
})().then(async () => {
	for(let folder of [
		"split", "split/ch", "split/en",
		"swagger", "swagger/ch", "swagger/en"
	]) await mkdir(`./json_${folder}`);

	for(let file of ["ChLaw", "ChOrder", "EnLaw", "EnOrder"]) {
		const lang = file.substring(0, 2).toLowerCase();
		let json = await fsP.readFile(`./source/${file}.json`, 'utf8');
		json = JSON.parse(json.trim()).Laws;
		let law, i = 0;
		process.stdout.write("Parsing " + file);
		while(law = json.pop()) {
			const pcode = (law.LawURL || law.EngLawURL).slice(-8);
			const path = `./json_split/${lang}/${pcode}.json`;
			await fsP.writeFile(path, JSON.stringify(law, null, "\t"));
			if(!(++i % 50)) process.stdout.write(".");
		}
		process.stdout.write("\n");
	}

});
