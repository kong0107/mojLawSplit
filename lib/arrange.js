'use strict';
const cpi = require('chinese-parseint');

const main = (law, pcode, lang) => {
    const result = {pcode};
    for(let attr in law) {
        const parser = reassigner[attr];
        switch(typeof parser) {
            case 'string':
                result[parser] = law[attr];
                break;
            case 'function':
                Object.assign(result, parser(law[attr], lang));
                break;
            default:
                console.error('Unknonw attribute ' + attr);
        }
    }
    return result;
};
module.exports = main;

/**
 * 處理編章節標題和各條文。
 * 因為要分析各編章節的條號範圍，所以必須一起處理。
 * @param {*} arr 原始資料中的「法規內容」結構化資料
 */
const contentParser = (arr, lang) => {
    const isEng = (lang === 'english');
    const divisions = [];
    const articles = [];
    const pool = arr.map(item => {
        if(item['條號']) {
            const m = item['條號'].match(/(\d+)(\-(\d+))?/);
            if(!m) throw new Error('條號錯誤');
            const article = {
                number: parseInt(m[1]) * 100 + parseInt(m[2] ? m[3] : 0),
                content: item['條文內容']
            };
            articles.push(article);
            return article;
        }
        else if(item['編章節']) {
            const text = item['編章節'];
            if(isEng) {
                /**
                 * 英文的編章節標題格式很豐富…
                 */
                const m = text.match(/(Chapter|Section|Subsection|Item) (\d+|[IVX]+)[\.]?\s*/);
                if(!m) throw new Error(text);
                return {
                    type: m[1],
                    number: m[2],
                    title: text.substring(m[0].length)
                };
            }
            else {
                const m = text.match(/第\s+([一二三四五六七八九十]+)\s+([編章節款目])(之([一二三四五六七八九十]+))?\s+/);
                if(!m) throw new Error(text);
                return {
                    type: m[2],
                    number: cpi(m[1]) * 100 + cpi(m[3] ? m[4] : 0),
                    title: text.substring(m[0].length)
                };
            }
        }
        else console.error('空白的章節'); // 待會濾掉
    }).filter(x => x);

    // 找編章節的條號範圍
    //let prevDivision = {}; // 因應不同層級的前一區塊
    pool.forEach((item, i) => {
        if(!item.title) return;

        // 下一個條文就是當前編章節的第一條
        let nextArticle;
        for(let j = i + 1; j < pool.length; ++j) {
            if(!pool[j].type) {
                nextArticle = pool[j];
                break;
            }
        }
        if(nextArticle) item.start = nextArticle.number;
        else console.error('找不到章節的第一條');

        divisions.push(item);
        //prevDivision[item.type] = item;
    });

    return {divisions, articles};
};


/**
 * 依照中文欄位名稱而給出英文欄位名稱。
 * 如果需要先處理資料，也在這邊進行。
 */
const reassigner = {
    '法規性質': 'type',
    '法規名稱': 'title',
    '法規網址': 'url',
    '法規類別': (list => ({category: list.split('＞')})),
    '最新異動日期': 'lastUpdate',
    '生效日期': 'effectiveDate',
    '生效內容': 'effectiveContent',
    '廢止註記': (val => ({isDiscarded: !!val})),
    '是否英譯註記': (val => ({isTranslated: val !== 'N'})),
    '英文法規名稱': 'english',
    '附件': 'attachments',
    '沿革內容': 'history',
    '前言': 'preamble',
    '法規內容': contentParser,
    '中文法規名稱': 'title', // 英文文件限定
    '最新英文異動日期': 'englishUpdate', // 英文文件限定
    '異動日期': 'date' // 歷史文件限定
};


/**
 * 測試用：只針對單一檔案
 */
if(!module.parent) {
    const pcode = process.argv[2];
    if(!pcode || !/^[A-Z]\d{7}$/.test(pcode))
        console.error('You need to assign a PCode');
    else Promise.resolve().then(async () => {
        const lang = 'Eng_';
        const fsP = require('fs').promises;
        const json = await fsP.readFile(`./json/${lang}FalVMingLing/${pcode}.json`, 'utf8');
        const arranged = main(JSON.parse(json), pcode, lang ? 'english' : 'chinese');
        await fsP.writeFile(`./json_arrange/${lang}FalVMingLing/${pcode}.json`, JSON.stringify(arranged, null, '\t'));
        console.log('Done');
    });
}
