/**
 * 把切好的 XML 轉為 JSON
 * @module xml2json
 * 使用方式有二：
 * 1. `node xml2json`
 * 2. 在其他專案引入成異步函數
 */
'use strict';
const fsP = require('fs').promises;
const loadSplit = require('./lib/loadSplit');
const writeFile = require('./lib/writeFile');
const parseXML = require('./lib/parseXML');
const mapDict = require('./lib/mapDict');
const getFilePath = require('./lib/getFilePath');

/**
 * 把切好的 XML 轉存成 JSON ，並用 Promise 回傳所有 JSON
 * @param {*} [data] xmlSplit 傳過來的資料。如果沒有的話就會抓 ./xml 資料夾裡的東西
 */
const main = async data => {
	const dict = data || (await loadSplit('xml'));
	await fsP.copyFile('./xml/UpdateDate.txt', './json/UpdateDate.txt');

	console.log('Converting XML to JSON');
	dict = await mapDict(async (xml, pcode, category, lnndate, lser) => {
		const result = await parseXML(xml);
		const filepath = './json/' + getFilePath(pcode, category, lnndate, lser) + '.json';
		await writeFile(filepath, JSON.stringify(result, null, '\t'));
		return result;
	}, dict);
	console.log('\nData converted');

	return dict;
};

if(module && module.parent) module.exports = main;
else main();
