'use strict';
const fsP = require('fs').promises;
const xmlSplit = require('./xmlSplit');
const saveSummary = require('./saveSummary');
const mapDict = require('./lib/mapDict');
const parseXML = require('./lib/parseXML');
const getFilePath = require('./lib/getFilePath');
const writeFile = require('./lib/writeFile');
const arrange = require('./lib/arrange');

Promise.resolve().then(async () => {
	let dict = await xmlSplit();
	await fsP.copyFile('./xml/UpdateDate.txt', './json/UpdateDate.txt');
	await fsP.copyFile('./xml/UpdateDate.txt', './json_arrange/UpdateDate.txt');

	console.log('Converting XML to JSON');
	dict = await mapDict(async (xml, pcode, category, lnndate, lser) => {
		const law = await parseXML(xml);
		const filepath = getFilePath(pcode, category, lnndate, lser) + '.json';

		await writeFile(`./json/${filepath}`, JSON.stringify(law, null, '\t'));
		await writeFile(
			`./json_arrange/${filepath}`,
			JSON.stringify(arrange(law, pcode, category), null, '\t')
		);

		return law;
	}, dict);
	console.log('All XML converted.');

	await saveSummary(dict);
	await fsP.copyFile('./json/index.json', './json_arrange/index.json');
});
