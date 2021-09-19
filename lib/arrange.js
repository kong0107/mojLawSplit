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
                Object.assign(result, parser(law[attr], pcode, lang));
                break;
            default:
                console.error(`${pcode} has an unknown attribute ${attr}`);
        }
    }
    return result;
};
module.exports = main;

/**
 * 把各種數字字串轉成整數
 */
const parseInt_extend = text => {
    text = text.toString().trim();
    let num = parseInt(text);
    if(!isNaN(num)) return num;

    const charCode = text.charCodeAt(0);
    if(charCode >= 0x2160)
        return charCode - 0x2160 + 1;

    text = text.toLowerCase();
    vocabulary.some((words, index) => {
        if(words.includes(text)) {
            num = index;
            return true;
        }
        return false;
    });
    if(isNaN(num)) throw new Error(`Unknown numeric text ${text}`);
    return num;
};
const vocabulary = [
    [],
    ['one', 'i'],
    ['two', 'ii'],
    ['three', 'iii'],
    ['four', 'iv'],
    ['five', 'v'],
    ['six', 'vi'],
    ['seven', 'vii'],
    ['eight', 'viii'],
    ['nine', 'ix', 'viiii'], // N0080014
    ['ten', 'x'],
    ['eleven', 'xi'],
    ['twelve', 'xii'],
    ['thirteen', 'xiii'],
    ['xiv'] // 憲法有十四章
];
const divTypesCh = ['編', '章', '節', '款', '目', '干', '大'];
const divTypesEn = [
    'part',
    'chapter', 'subchapter',
    'section', 'subsection',
    'paragraph', 'subparagraph',
    'item'
];


/**
 * 處理編章節標題和各條文。
 * 因為要分析各編章節的條號範圍，所以必須一起處理。
 * @param {*} arr 原始資料中的「法規內容」結構化資料
 * @param {string} lang
 */
const contentParser = (arr, pcode, lang) => {
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

        // 接下來是編章節
        const text = item['編章節'];
        let division;
        if(isEng) {
            /**
             * 英文的編章節標題格式很豐富，例：
             * * B0000001: 有些節拼錯成 Section
             * * D0020010: 款是 Paragraph
             * * G0380058: Chapter One -- General Provisions
             * * H0080027: Part 在 Chapter 之下
             * * K0060091: 款是 Subparagraph
             * * N0080014: 羅馬數字錯誤Chapter VIIII
             * * O0080001: 節是 Subchapter
             */
            let type, number, title;
            let m = text.match(/^(Part|Chapter|Subchapter|Section|Setcion|Sub\-?section|Paragraph|Subparagraph|Item)\s?[\(\-\u2013]?\s?(\d+|[IVX]+|[\u2160-\u216B])(\-(\d+|[IVX]+))?\)?\s*[,\.\-\:\u2013\u2014\uFF0D\uFF1A]?/i)
                || text.match(/^(Part|Chapter|Section) (One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen)\s*[\-\:\u2013\uFF1A]?\-?/i)
            ;
            if(m) {
                type = m[1];
                number = parseInt_extend(m[2]) * 100 + parseInt_extend(m[3] ? m[4] : 0);
                title = text.substring(m[0].length).trim();
            }
            else if(m = text.match(/^([IVX]+)\.?/)) {
                // D0070008, G0430003, L0030056, N0060010
                type = (pcode === 'L0030056') ? 'section' : 'chapter';
                number = parseInt_extend(m[1].trim()) * 100;
                title = text.substring(m[0].length).trim();
            }
            else if(pcode === 'H0120001') {
                type = 'chapter';
                number = divisions[divisions.length - 1].number + 100;
                title = text;
            }
            else if(pcode === 'H0170012' && !text) {
                type = 'chapter';
                number = 0;
                title = '';
            }
            else throw new Error(`${pcode} with title not matched: ${text}`);

            // 把「節」的名稱統一一些
            type = type.toLowerCase();
            if(type === 'setcion' || type === 'sub-section' || type === 'subchapter') type = 'section';
            else if(type === 'part' && pcode === 'H0080027') type = 'section';
            else if(type.endsWith('paragraph')) type = 'subsection'; // D0020010, K0060091

            if(title && !/^[A-Za-z\(（)]/.test(title)) throw new Error(`${pcode} has weird title: ${text}`);
            division = {type, number, title, typeIndex: divTypesEn.indexOf(type)};
        }
        else {
            let m, type, number, title;
            if(m = text.match(/^第\s*([一二三四五六七八九十百]+)\s*([編章節款目])(之([一二三四五六七八九十百]+))?/)) {
                type = m[2];
                number = cpi(m[1]) * 100 + cpi(m[3] ? m[4] : 0);
                title = text.substring(m[0].length).trim();
            }
            else if(m = text.match(/^[壹貳參肆伍陸柒捌玖拾]+/)) {
                // S0110006
                type = '大';
                number = cpi(m[0]) * 100;
                title = text.substring(m[0].length).trim();
            }
            else if((number = "0甲乙丙丁戊己庚辛壬癸".indexOf(text.charAt(0))) > 0) {
                // S0110013
                type = '干';
                number *= 100;
                title = text.substring(2).trim();
            }
            else if(pcode === 'H0170012' && !text) {
                type = '章';
                number = 0;
                title = '';
            }
            else throw new Error(text);
            division = {type, number, title, typeIndex: divTypesCh.indexOf(type)};
        }
        divisions.push(division);
        return division;
    }).filter(x => x);

    // 找編章節的條號範圍
    let openDivisions = [];
    pool.forEach((item, index) => {
        if(item.type) return;

        // 將緊鄰的前方編章節們的開頭均設為當前條文
        for(let j = index - 1;
            (j >= 0) && pool[j].type;
            --j
        ) {
            const div = pool[j];
            div.start = item.number;
            openDivisions.push(div);
        }

        // 如果下一個元素是編章節，那麼前面未收尾且層級沒有較高的編章節的結尾就是當前這一條。
        const next = pool[index + 1];
        if(next && next.type) {
            openDivisions = openDivisions.filter(div => {
                if(div.typeIndex >= next.typeIndex) {
                    div.end = item.number;
                    return false;
                }
                return true;
            });
        }
    });
    // 把還沒收尾的編章節的結尾均設定為最後一條
    const lastArtNum = articles[articles.length - 1].number;
    openDivisions.forEach(div => div.end = lastArtNum);

    // 整理成巢狀。方法：塞到前一個層級比自己高的裡面。
    let minType = -1;
    const nested = divisions.filter((div, index) => {
        div.children = [];
        if(minType < 0) {
            minType = div.typeIndex;
            return true;
        }
        if(div.typeIndex === minType) return true;
        for(let j = index - 1; j >= 0; --j) {
            if(divisions[j].typeIndex < div.typeIndex) {
                divisions[j].children.push(div);
                return false;
            }
        }
        throw new Error(`${pcode} 編章節結構錯誤`);
    });

    // 把非必要的成員砍掉
    divisions.forEach(div => {
        delete div.typeIndex;
        if(!div.children.length) delete div.children;
    });

    return {divisions: nested, articles};
};

/**
 * 處理「沿革內容」
 */
const historyParser = (text, pcode, lang) => {
    let history;
    if(lang === 'english') {
        if(pcode === 'B0000001') history = text.split(/\r?\n/);
        else if(/^\d\./.test(text))
            history = text.substring(2).split(/\r?\n\d+\./);
        else history = text.split(/(\r?\n)+/);
    }
    else { // 中文
        if(pcode === 'A0000001') history = [text.substring(2)];
        else if(/^\d\./.test(text)) {
            history = text.substring(2)
                .split(/\n\d+\./)
                .map(item => item
                    .trim()
                    .replace(/\s+/g, '')    // 把空格全拿掉
                    .replace(/([\w\-、～]+)/g, ' $1 ')  // 把英數、多個條號的前後補上空白（有些公文字號裡面有英文）
                    .replace(/（ (\d+) ）/g, '（$1）')  // 但公文括號裡的數字不用前後空白
                )
            ;
        }
        else {
            console.error(`${pcode} 沿革格式不太對`);
            history = [text];
        }
    }
    return {history};
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
    '生效內容': (text => ({effectiveContent: text.replace(/\r?\n/g, '')})),
    '廢止註記': (val => ({isDiscarded: !!val})),
    '是否英譯註記': (val => ({isTranslated: val !== 'N'})),
    '英文法規名稱': 'english',
    '附件': 'attachments',
    '沿革內容': historyParser,
    '前言': (text => ({preamble: text.replace(/\r?\n/g, '')})), // A0000001, A0000002, A0000003, A0000005, G0310033, G0380192
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
        const lang = ''; //Eng_';
        const fsP = require('fs').promises;
        const json = await fsP.readFile(`./json/${lang}FalVMingLing/${pcode}.json`, 'utf8');
        const arranged = main(JSON.parse(json), pcode, lang ? 'english' : 'chinese');
        await fsP.writeFile(`./json_arrange/${lang}FalVMingLing/${pcode}.json`, JSON.stringify(arranged, null, '\t'));
        console.log('Done');
    });
}
