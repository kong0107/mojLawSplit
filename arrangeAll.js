/**
 * 把所有 JSON 檔再做轉換
 */
'use strict';
const fsP = require('fs').promises;
const loadSplit = require('./lib/loadSplit');
const mapDict = require('./lib/mapDict');
const getFilePath = require('./lib/getFilePath');
const writeFile = require('./lib/writeFile');
const arrange = require('./lib/arrange');

const main = async dict => {
    if(!dict) dict = await loadSplit('json', JSON.parse);
    await fsP.mkdir('./json_arrange').catch(reason => {
        if(reason.code !== 'EEXIST') throw new Error('Failed to create directory');
    });
	await fsP.copyFile('./json/UpdateDate.txt', './json_arrange/UpdateDate.txt');

	let summary = (await fsP.readFile('./json/index.json', 'utf8'))
		.replace(/{"PCode"/g, '{"pcode"');
	summary = JSON.parse(summary)
		.filter(law => !law.name.endsWith("表"));
	summary = JSON.stringify(summary)
		.replaceAll('{"pcode"', '\n{"pcode"')
		.slice(0, -1).concat('\n]\n');
	await writeFile('./json_arrange/index.json', summary);

	console.log('Arranging JS object');
	dict = await mapDict(async (law, pcode, category, lnndate, lser) => {
		const result = await arrange(law, pcode, category);
		const filepath = './json_arrange/' + getFilePath(pcode, category, lnndate, lser) + '.json';
		await writeFile(filepath, JSON.stringify(result, null, '\t'));
		return result;
	}, dict);
	console.log('\nArrangement successed.');

	return dict;
};

if(module && module.parent) module.exports = main;
else main();
