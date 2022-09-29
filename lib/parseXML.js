const xml2jsobj = require('xml2jsobj');

/**
 * 把 XML 處理成需要的格式
 */
const main = async xml => {
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
								'Warning: 【%s】%s 有空白的編章節',
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
								'Warning: 【%s】%s%s 沒有內容',
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
				law[attr] = nodeList.map(node => {
					// console.assert(node.children.length === 2);
					return {
						[node.children[0].name]: node.children[0].children[0],
						[node.children[1].name]: node.children[1].children[0]
					};
				});
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

const x2j = text => new Promise((resolve, reject) =>
	xml2jsobj.convert(text, (err, result) => err ? reject(err) : resolve(result))
);

if(module && module.parent) module.exports = main;
else main();
