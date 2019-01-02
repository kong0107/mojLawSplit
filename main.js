'use strict';
const fsP = require('fs').promises;
const path = require('path');
const xml2jsobj = require('xml2jsobj');
const json2xml = require('json2xml');
const cpi = require('chinese-parseint');

const sources = ['FalVMingLing.xml', 'Eng_FalVMingLing.xml', 'HisMingLing.xml'];

// Main
Promise.resolve().then(async () => {
	let update;
	const dict = [];
	for(let src of sources) {
		console.log(`Opening ${src}`);
		const whole = (await fsP.readFile(`./source/${src}`, 'utf8')).replace(/\r\n/g, '\n');
		console.log('Parsing');

		update = whole.match(/UpdateDate="(\d+)"/)[1];
		await writeFile('./xml/UpdateDate.txt', update);
		await writeFile('./json/UpdateDate.txt', update);
		await writeFile('./json_arranged/UpdateDate.txt', update);

		const frags = whole.split(/<\/?法規>/).filter((f, i) => i % 2);
		for(let i = 0; i < frags.length; ++i) {
			// 每處理100個法規就輸出一個小點，讓使用者知道有在運作。
			if(!(i % 100)) process.stdout.write('.');

			const xml = '<法規>\n'
				+ frags[i].trim()
					.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, '') // 有時有一些奇怪的字元
					.replace(/\n    ( *)</g, '\n$1<') // 拿掉四個半形空格縮排
				+ '\n</法規>\n'
			;

			// 依照是否為英文或歷史法規，給出不同的檔案路徑
			const lang = /<中文法規名稱>/.test(xml) ? 'Eng_' : '';
			const m = xml.match(/pcode=(\w+)(&lnndate=(\d+)&lser=(\d+))?/i);
			const pcode = m[1];
			const filepath = m[2]
				? `HisMingLing/${pcode}/${m[3]}_${m[4]}`
				: `${lang}FalVMingLing/${pcode}`
			;

			// 寫入 XML
			await writeFile(`./xml/${filepath}.xml`, xml);

			// 轉換成 JS obj 並寫入 JSON
			const law = await parseXML(xml);
			await writeFile(`./json/${filepath}.json`, JSON.stringify(law, null, '\t'));

			// 整理一些內容，再存一份機器更容易處理的版本。
			law.PCode = pcode;
			Object.assign(
				law,
				parseContent(law['法規內容'])
			);
			delete law['法規內容'];
			await writeFile(`./json_arranged/${filepath}.json`, JSON.stringify(law, null, '\t'));

			// 處理總匯
			let dictItem = dict.find(lawAbs => lawAbs.PCode === pcode);
			if(!dictItem) dict.push(dictItem = {PCode: pcode});
			if(law['異動日期']) { // 歷史法規
				if(!dictItem.oldNames) dictItem.oldNames = [];
				if(!dictItem.oldNames.includes(law['法規名稱']))
					dictItem.oldNames.push(law['法規名稱']);
			}
			else if(law['中文法規名稱']) dictItem.english = law['英文法規名稱'];
			else {
				dictItem.name = law['法規名稱'];
				dictItem.lastUpdate = law['最新異動日期'];
			}
		}
		process.stdout.write('\n');
	}

	dict.sort((a, b) => a.PCode - b.PCode)
	.forEach(law => {
		// 刪掉不需要的老名字和空陣列
		if(!law.oldNames) return;
		const pos = law.oldNames.indexOf(law.name);
		if(pos > -1) law.oldNames.splice(pos, 1);
		if(!law.oldNames.length) delete law.oldNames;
	});
	const dictJSON = JSON.stringify(dict)
		.replace(/{"PCode"/g, '\n{"PCode"')
		.slice(0, -1).concat('\n]\n')
	;
	await writeFile(`./json/index.json`, dictJSON);

	const dict4xml = {
		LAWS: dict.map(law => {
			const law4xml = [
				{PCODE: law.PCode},
				{NAME: law.name},
				{UPDATE: law.lastUpdate}
			];
			if(law.english) law4xml.push({ENGLISH: law.english});
			if(law.oldNames) law4xml.push({
				HISTORY: law.oldNames.map(name => ({NAME: name}))
			});
			return {LAW: law4xml};
		}),
		attr: {UpdateDate: update}
	};
	const dictXML = json2xml(dict4xml, {attributes_key: 'attr'})
		.replace(/<LAW>/g, '\n<LAW>')
		.replace('</LAWS>', '\n</LAWS>\n')
	;
	await writeFile(`./xml/index.xml`, dictXML);
	console.log('All done.');
})
.catch(reason => console.error(reason));


// 把 xml2jsobj 包成 Promise
const x2j = text => new Promise((resolve, reject) =>
	xml2jsobj.convert(text, (err, result) => err ? reject(err) : resolve(result))
);

// 寫入檔案前先建立其所在資料夾
const writeFile = async (file, data) => {
	await fsP.mkdir(path.dirname(file), {recursive: true});
	await fsP.writeFile(file, data);
	return;
};

// 把 XML 處理成需要的格式
const parseXML = async xml => {
	const law = {};
	const lawInfo = (await x2j(xml)).children;

	for(let j = 0; j < lawInfo.length; ++j) {
		const attr = lawInfo[j].name;
		const nodeList = lawInfo[j].children;
		if(!nodeList) continue;
		switch(attr) {
			case '法規內容': {
				law[attr] = nodeList.map(artInfo => {
					switch(artInfo.name) {
						case '編章節': {
							const title = artInfo.children ? artInfo.children[0] : '';
							if(!title) console.error(
								'Warning: 【%s】%s有空白的編章節',
								law['法規名稱'] || law['中文法規名稱'],
								law['異動日期'] ? `(${law['異動日期']}) ` : ''
							);
							return {'編章節': title};
						}
						case '條文': {
							const title = artInfo.children[0].children[0];
							const content = artInfo.children[1].children
								? artInfo.children[1].children[0]
								: ''
							;
							const article = {'條號': title};
							if(content) article['條文內容'] = content;
							else console.error(
								'Warning: 【%s】%s%s沒有內容',
								law['法規名稱'] || law['中文法規名稱'],
								law['異動日期'] ? `(${law['異動日期']}) ` : '',
								title
							);
							return article;
						}
						default:
							throw new TypeError(`Unknown tag ${artInfo.name}`);
					}
				});
				break;
			}
			case '附件': {
				law[attr] = nodeList.map(node => node.children[0]);
				break;
			}
			default: {
				if(nodeList.length != 1)
					throw new TypeError(`Unknown tag ${attr}`);
				const text = nodeList[0].trim();
				if(text) law[attr] = text;
			}
		}
	}
	return law;
};

/**
 * 編章節巢狀樹的節點
 * @typedef {Object} Division
 * @property {string} type 編章節的種類，例如"目"
 * @property {number} number 編號，例如「第二十四節之一」會以 2401 來表示
 * @property {number} start 開始的條號
 * @property {number} end 結束的條號
 * @property {Division[]} [divisions] 子分區
 */

/**
 * 法條物件
 * @typedef {Object} LawArticle
 * @property {number} number 編號，例如「第七十七條之二十」會以 7720 來表示
 * @property {LawPara[]} content 巢狀條文結構
 */

 /**
  * 法條條文巢狀樹的節點
  * @typedef {Object} LawPara
  * @property {string} text 段落內文
  * @property {number} stratum 層級。0為「項」，1為「類」，2為「款」，…
  * @property {LawPara[]} [children] 下一層的物件
  */

/**
 * 把「法規內容」整理出分區和條文
 * @param {Object[]} lawContent 資料中的「法規內容」欄位的內容列表
 * @returns {{divisions: Division[], articles: LawArticle[]}} 包含 divisions 和 articles 兩個屬性的物件
 */
const parseContent = lawContent => {
	// 還沒好
	const divisions = [];
	const articles = [];
	lawContent.forEach(sth => {
		if(sth['編章節']) {
			divisions.push(sth['編章節']);
		}
		else if(sth['條號']) {
			articles.push(sth);
		}
		else {
			// 期貨交易法英文版第79條沒有內容
		}
	});
	return {divisions, articles};
};
