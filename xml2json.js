/**
 * 把切好的 XML 轉為 JSON
 * @module xml2json
 * 使用方式有二：
 * 1. `node xml2json`
 * 2. 在其他專案引入成異步函數
 */
'use strict';
const fsP = require('fs').promises;
const xml2jsobj = require('xml2jsobj');
const loadSplit = require('./lib/loadSplit');
const writeFile = require('./lib/writeFile');

Array.prototype.mapAsync = require('./lib/mapAsync');
Array.prototype.forEachAsync = require('./lib/mapAsync').forEachAsync;

/**
 * 把切好的 XML 轉存成 JSON ，並用 Promise 回傳所有 JSON
 * @param {*} [data] xmlSplit 傳過來的資料。如果沒有的話就會抓 ./xml 資料夾裡的東西
 */
const main = async data => {
	const dict = data || (await loadSplit('xml'));
	await fsP.copyFile('./xml/UpdateDate.txt', './json/UpdateDate.txt');

    console.log('Converting XML to JSON');
    await dict.forEachAsync(async (dictItem, counter) => {
		if(!(counter % 100)) process.stdout.write('.');
        await [
            {lang: 'chinese', path: 'FalVMingLing'},
            {lang: 'english', path: 'Eng_FalVMingLing'}
        ].forEachAsync(async ({lang, path}) => {
			if(!dictItem[lang]) return;
            dictItem[lang] = await parseXML(dictItem[lang]);
            await writeFile(`./json/${path}/${dictItem.pcode}.json`, JSON.stringify(dictItem[lang], null, '\t'));
		});
        await dictItem.history.forEachAsync(async hisItem => {
			hisItem.data = await parseXML(hisItem.data);
            await writeFile(
                `./json/HisMingLing/${dictItem.pcode}/${hisItem.lnndate}_${hisItem.lser}.json`,
                JSON.stringify(hisItem.data, null, '\t')
            );
        });
	});
	console.log('\nData converted');

	return dict;
};

// 把 xml2jsobj 包成 Promise
const x2j = text => new Promise((resolve, reject) =>
	xml2jsobj.convert(text, (err, result) => err ? reject(err) : resolve(result))
);

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
								'\nWarning: 【%s】%s 有空白的編章節',
								law['法規名稱'] || law['中文法規名稱'],
								law['異動日期'] ? `(${law['異動日期']})` : ''
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
								'\nWarning: 【%s】%s%s 沒有內容',
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

if(module && module.parent) module.exports = main;
else main();
