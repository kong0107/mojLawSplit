/**
 * 切開原始的 XML 檔並存成許多小檔。
 * @module xmlSplit
 * 使用方式有二：
 * 1. `node xmlSplit`
 * 2. 在其他專案引入成異步函數
 */
'use strict';
const fsP = require('fs').promises;
const path = require('path');
const writeFile = require('./lib/writeFile');

/**
 * 回傳會被解決為
 * @returns {Promise}
 * [{
 *   pcode: string,
 *   chinese: string,
 *   english: string,
 *   history[]: {
 *	   lnndate: string,
 *     lser: string,
 *     data: string
 *	 }
 * }]
 */
const main = async () => {
	let update;
    const dict = [];
    const files = await fsP.readdir('./source');
	for(let src of files) {
        if(path.extname(src) !== '.xml') continue;

		console.log(`Opening ${src}`);
		const whole = (await fsP.readFile(`./source/${src}`, 'utf8'));
		console.log('Parsing');

		update = whole.match(/UpdateDate="(\d+)"/)[1];
		await writeFile('./xml/UpdateDate.txt', update);

		const frags = whole.split(/<\/?法規>/).filter((f, i) => i % 2);
		for(let i = 0; i < frags.length; ++i) {
			// 每處理100個法規就輸出一個小點，讓使用者知道有在運作。
			if(!(i % 100)) process.stdout.write('.');

			const xml = '<法規>\r\n'
				+ frags[i].trim()
					.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, '') // 有時有一些奇怪的字元
					.replace(/\r\n    ( *)</g, '\r\n$1<') // 拿掉四個半形空格縮排
				+ '\r\n</法規>\r\n'
            ;

			const [, pcode, , lnndate, lser] = xml.match(/pcode=(\w+)(&lnndate=(\d+)&lser=(\d+))?/i);
            let filepath = path.join('./xml', path.basename(src, '.xml'), pcode);
            if(lnndate) filepath += `/${lnndate}_${lser}`;
            await writeFile(filepath + '.xml', xml);

            let dictItem = dict.find(item => item.pcode == pcode);
            if(!dictItem) dict.push(dictItem = {
                pcode: pcode,
                history: []
            });
            if(lnndate) dictItem.history.push({lnndate, lser, data: xml});
            else dictItem[/<中文法規名稱>/.test(xml) ? 'english' : 'chinese'] = xml;
		}
		process.stdout.write('\n');
	}
    console.log('XML split.');
    return dict;
};

if(module && module.parent) module.exports = main;
else main();
