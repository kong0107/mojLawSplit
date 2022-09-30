/**
 * 從切好的 JSON 抓出匯總
 * @module saveSummary
 * 使用方式有二：
 * 1. `node saveSummary`
 * 2. 在其他專案引入成異步函數
 */
'use strict';
const fsP = require('fs').promises;
const json2xml = require('json2xml');
const loadSplit = require('./lib/loadSplit');
const writeFile = require('./lib/writeFile');

const main = async data => {
    const dict = data || (await loadSplit('json', JSON.parse));

    // 整理資料
    const summary = dict.map(dictItem => {
        const name = dictItem.chinese['法規名稱'];
        const sumItem = {
            PCode: dictItem.pcode,
            name: name,
            lastUpdate: dictItem.chinese['最新異動日期']
        };
        if(dictItem.english) sumItem.english = dictItem.english['英文法規名稱'];

        const updates = [], oldNames = [];
        dictItem.history.forEach(hisItem => {
            const oldName = hisItem.data['法規名稱'];
            //if(!oldName) console.log(JSON.stringify(hisItem.data).substring(0, 100));
            updates.push(hisItem.lnndate);
            if(oldName != name && !oldNames.includes(oldName)) oldNames.push(oldName);
        });
        if(updates.length) sumItem.updates = updates;
        if(oldNames.length) sumItem.oldNames = oldNames;
        return sumItem;
    }).sort((a, b) => (a.PCode < b.PCode) ? -1 : 1);

    // 寫入 JSON
    console.log('Saving ./json/index.json');
    await writeFile('./json/index.json', JSON.stringify(summary)
        .replaceAll('{"PCode"', '\n{"PCode"')
        .slice(0, -1).concat('\n]\n')
    );

    // 轉成 XML ，但要先弄成 json2xml 的格式
    console.log('Saving ./xml/index.xml');
    const update = await fsP.readFile('./xml/UpdateDate.txt', 'utf8');
    const obj4xml = summary.map(sumItem => {
        const children = [];
        if(sumItem.updates) {
            children.push({
                UPDATES: sumItem.updates.map(date => ({DATE: date}))
            });
            delete sumItem.updates;
        }
        if(sumItem.oldNames) {
            children.push({
                HISTORY: sumItem.oldNames.map(name => ({NAME: name}))
            });
            delete sumItem.oldNames;
        }
        return {
            LAW: children,
            attr: sumItem
        };
    });
    const xml = json2xml(
        {LAWS: obj4xml, attr: {UpdateDate: update}},
        {attributes_key: 'attr'}
    ).replace(/<LAW /g, '\n<LAW ')
    .replace('</LAWS>', '\n</LAWS>\n');
	await writeFile(`./xml/index.xml`, xml);
};

if(module && module.parent) module.exports = main;
else main();
