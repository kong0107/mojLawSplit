'use strict';
const fsP = require('fs').promises;
const xmlSplit = require('./xmlSplit');
const saveSummary = require('./saveSummary');
const mapDict = require('./lib/mapDict');
const parseXML = require('./lib/parseXML');
const getFilePath = require('./lib/getFilePath');
const writeFile = require('./lib/writeFile');
const arrange = require('./lib/arrange');

(async () => {
	let dict = await xmlSplit();

	try {
		await fsP.mkdir('./json');
	} catch(err){}
	fsP.copyFile('./xml/UpdateDate.txt', './json/UpdateDate.txt');

	try {
		await fsP.mkdir('./json_arrange');
	} catch(err){}
	fsP.copyFile('./xml/UpdateDate.txt', './json_arrange/UpdateDate.txt');

	console.log('Converting XML to JSON');
	dict = await mapDict(async (xml, pcode, category, lnndate, lser) => {
		const law = await parseXML(xml);
		const filepath = getFilePath(pcode, category, lnndate, lser) + '.json';

		await writeFile(`./json/${filepath}`, JSON.stringify(law, null, '\t'));

		const arranged = arrange(law, pcode, category);
		// if(arranged.theAct) {
		// 	let theAct;
		// 	let subtitle, title = arranged.theAct.title;
		// 	do {	// 雙母法的情形，例如 A0030123, A0030273, E0030010 ，但 G0310029, G0340020, M0130009 這種不知道該怎麼辦才好…
		// 		if(subtitle) title = subtitle;
		// 		theAct = dict.find(l => l.chinese.includes(`<法規名稱>${title}</法規名稱>`));
		// 		if(theAct && subtitle) console.debug("\n!YOHO!", arranged.pcode);
		// 		subtitle = title.substring(title.indexOf("及") + 1);
		// 	} while(!theAct && subtitle !== title);
		// 	if(!theAct) console.warn(arranged.pcode, arranged.title, "找不到母法", arranged.theAct.title);
		// 	else arranged.theAct = {pcode: theAct.pcode, title};
		// }
		await writeFile(`./json_arrange/${filepath}`, JSON.stringify(arranged, null, '\t'));

		return law;
	}, dict);
	console.log('All XML converted.');

	await saveSummary(dict);
})();
