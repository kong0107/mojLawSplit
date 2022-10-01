/**
 * @module arrange
 * @desc 接收 swagger API 的一個法規並轉換格式。
 */

'use strict';
const cpi = require('chinese-parseint');

/**
 * @func main
 * @param {Object} law
 * @returns {Object}
 */
module.exports = law => {
    const pcode = (law.LawURL || law.EngLawURL).slice(-8);
    // const lang = law.EngLawURL ? "en" : "ch";
    const result = {pcode};
    for(let attr in law) {
        if(!law[attr]) continue;
        if(Array.isArray(law[attr]) && law[attr].length === 0) continue;
        const parser = reassigner[attr];
        switch(typeof parser) {
            case "boolean":
                if(parser) result[attr] = law[attr];
                break;
            case "string":
                result[parser] = law[attr];
                break;
            case "function":
                Object.assign(result, parser(law[attr], pcode));
                break;
            default:
                console.error(`${pcode} has an unknown attribute ${attr}`);
        }
    }
    return result;
};


/**
 * @const reassigner
 * @desc 各欄位的處理方式。若為 true 則原封不動；若為字串則換鍵名；若為函數則取其結果。
 */
const reassigner = {
    'LawLevel': true,
    'LawName': true, // 雙語都有
    'LawURL': false,
    'LawCategory': (list => ({category: list.split('＞')})), // Array
    'LawModifiedDate': true,
    'LawEffectiveDate': true,
    'LawEffectiveNote': effectiveNoteParser, // string
    'LawAbandonNote': (() => ({discarded: true})), // boolean
    'LawHasEngVersion': false, // 直接用英文名欄位判斷
    'EngLawName': true,  // 雙語都有
    'LawAttachements': attachmentsParser, // Array
    'LawHistories': historiesParser, // Array
    'LawForeword': (text => ({foreword: text.replace(/\s+/g, '')})), // string
    'LawArticles': contentParser,

    'EngLawURL': false,
    'EngLawModifiedDate': true,
    'EngLawAbandonNote': (() => ({discarded: true})), // boolean
    'EngLawAttachements': attachmentsParser, // Array
    'EngLawHistories': enHistoriesParser, // Array
    'EngLawForeword': 'foreword',
    'EngLawArticles': contentParser
};

function effectiveNoteParser(text) {
    let paras;
    if(!text.startsWith("1.")) paras = [text];
    else paras = text.substring(2).split(/\r?\n\d+\./);
    const effectiveNote = paras.map(para =>
        para.trim()
        .replaceAll(/\r?\n\s*/g, '')
        .replaceAll(/\s+/g, ' ')
    ).join("\n");
    return {effectiveNote};
}

function attachmentsParser(arr) {
    const attachments = {};
    arr.forEach(obj => {
        const id = obj.FileURL.slice(-10);
        attachments[id] = obj.FileName;
    });
    return {attachments};
}

function historiesParser(text) {
    console.assert(/^\d+\./.test(text)); /// 有些直接從 "2." 開始，有些是有個空白的 "1."
    const paras = text.substring(2).split(/\d+\./);
    const histories = paras.map(para => {
        para = para.trim();
        if(!para) return ""; /// 有些是有個空白的 "1."，如 A0020012
        return para.substring(4)
            .replaceAll(/\r?\n\s*中華民國/g, '；') /// A0000001, A0000003
            .replaceAll(/\s+/g, ' ') /// 多個空格（包含換行）都換成一個空格
            .replaceAll(/([\u4E00-\u9FFF（）；：，。])\s([\u4E00-\u9FFF（）；：，。])/g, "$1$2") // 兩個中文字或全形標點符號中間有空格的話，就拿掉空格
        ;
    });
    return {histories};
}

function enHistoriesParser(text, pcode) {
    let histories;
    if(/^\d+\s?\./.test(text)) {
        histories = text.split(/(^|\r\n)\d{1,2}\s?\.\s*/).filter(x => x.trim());
        return {histories};
    }
    return {histories: text};
}

const vocabulary = [
    [],
    ['one', 'i', '壹', '甲'],
    ['two', 'ii', '貳', '乙'],
    ['three', 'iii', '參', '丙'],
    ['four', 'iv', '肆', '丁'],
    ['five', 'v', '伍', '戊'],
    ['six', 'vi', '陸', '己'],
    ['seven', 'vii', '柒', '庚'],
    ['eight', 'viii'],
    ['nine', 'ix', 'viiii'], // N0080014
    ['ten', 'x'],
    ['eleven', 'xi'],
    ['twelve', 'xii'],
    ['thirteen', 'xiii'],
    ['xiv'], // 憲法有十四章
    ['xv'] // N0090029
];
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
 * @param {Array} arr 原始資料中的「法規內容」結構化資料
 * @param {string} lang
 */
function contentParser(arr, pcode) {
    const divisions = [];
    const articles = [];
    arr.forEach((item, index) => {
        switch(item.ArticleType || item.EngArticleType) {
            case "A": {
                /**
                 * 條號
                 * 中文幾乎都是 /^第 \d+(-\d+)? 條$/ ，部分是 /^\d+$/ ；
                 * 英文幾乎都是 /^Article \d+(-\d+)?$/ ，除了 G0300104, G0350051, H0160031, K0020050 是 /^\d+$/ ，及 A0030234 有奇怪的空格結尾。
                 */
                const match = (item.ArticleNo || item.EngArticleNo).match(/(\d+)(-(\d+))?/);
                const number = parseInt(match[1]) * 100 + (match[2] ? parseInt(match[3]) : 0);
                articles.push({
                    number,
                    content: item.ArticleContent || item.EngArticleContent,
                    index
                });
                break;
            }
            case "C": {
                /**
                 * 編章節
                 * ArticleNo 和 EngArticleNo 一概為空字串。
                 */
                let type, number, title, depth;
                if(item.ArticleContent) {
                    /**
                     * 中文編章節
                     */
                    const text = item.ArticleContent;
                    switch(pcode) {
                        case "S0110006": {
                            const match = text.match(/^\s*([壹貳參肆伍陸柒])\s+(.+)$/);
                            console.assert(match, pcode, text);
                            type = "大";
                            number = vocabulary.findIndex(words => words.includes(match[1])) * 100;
                            title = match[2];
                            break;
                        }
                        case "S0110013": {
                            const match = text.match(/^\s*([甲乙丙丁戊己庚])\s+(.+)$/);
                            console.assert(match, pcode, text);
                            type = "干";
                            number = vocabulary.findIndex(words => words.includes(match[1])) * 100;
                            title = match[2];
                            break;
                        }
                        default: {
                            const match = text.match(/^\s*第\s*([零一二三四五六七八九十百]+)\s*([編章節款目])(之([一二三四五六七八九十]+))?\s*(.+)$/);
                            console.assert(match, pcode, text);
                            type = match[2];
                            depth = "編章節款目".indexOf(type);
                            number = cpi(match[1]) * 100 + (match[3] ? cpi(match[4]) : 0); // positive integer
                            title = match[5];
                        }
                    }
                    divisions.push({
                        type, depth,
                        number, title,
                        index
                    });
                }
                else {
                    /**
                     * 英文編章節，蠻亂的
                     */
                    const text = item.EngArticleContent;
                    console.assert(text);

                    const head = text.trim().split(/\s/, 1)[0].toLowerCase();
                    type = divTypesEn.find(t => head.startsWith(t));
                    if(!type) {
                        if(/^[ivx]+\.?$/.test(head)) {
                            if(pcode === 'L0030056') type = "section";
                            else type = "chapter";
                        }
                        else if(head === "sub-section") type = "subsection";
                        else if(head === "setcion") type = "section"; // B0000001
                    }
                    console.assert(type, pcode, text);
                    depth = divTypesEn.indexOf(type);


                    let match;
                    if(match = text.match(/\s*(Part|Chapter|Section) ([A-z]+)/i)) {
                        number = vocabulary.findIndex(words => words.includes(match[2].toLowerCase())) * 100;
                        console.assert(number);
                        title = text.substring(match.index + match[0].length);
                    }
                    else if(match = text.match(/(\d+|[IVX]+|[\u2160-\u216B])(\-(\d+|[IVX]+))?/)) {
                        number = parseInt_extend(match[1]) * 100 + (match[2] ? parseInt_extend(match[3]) : 0);
                        console.assert(number >= 100, pcode, text);
                        title = text.substring(match.index + match[0].length);
                    }
                    else console.error(pcode, text);

                    title = title.replace(/^\s*\.\s*/, "");
                    divisions.push({
                        type, depth,
                        number, title: title.trim(),
                        index
                    });
                }
                break;
            }
            default: console.error("unknown ArticleType", pcode);
        }
    });

    /**
     * 偵測每個編章節的起訖條文。
     */
    divisions.forEach(div => {
        div.start = articles.find(a => a.index > div.index).number;
        const previousArticle = articles.findLast(a => a.index < div.index);
        if(previousArticle) divisions
            .filter(d => d.index < div.index && d.depth >= div.depth && !d.end)
            .forEach(d => d.end = previousArticle.number)
        ;
    });
    const lastArticleNumber = articles[articles.length - 1].number;
    divisions.filter(d => !d.end).forEach(d => d.end = lastArticleNumber);

    /**
     * 將編章節調整為巢狀結構
     */
    const nested = [];
    for(let i = divisions.length - 1; i >= 0; --i) {
        const cur = divisions[i];
        const parent = divisions.findLast(d => d.index < cur.index && d.depth < cur.depth);
        if(parent) {
            if(!parent.children) parent.children = [];
            parent.children.unshift(cur);
        }
        else nested.unshift(cur);
    }

    divisions.forEach(d => {delete d.index; delete d.depth;});
    articles.forEach(a => delete a.index);
    return divisions.length ? {divisions: nested, articles} : {articles};
}


/**
 * 把各種數字字串轉成整數
 */
function parseInt_extend(text) {
    text = text.toString().trim();
    let num = parseInt(text);
    if(!isNaN(num)) return num;

    const charCode = text.charCodeAt(0);
    if(charCode >= 0x2160)
        return charCode - 0x2160 + 1;

    text = text.toLowerCase();
    num = vocabulary.findIndex(words => words.includes(text));
    if(num < 0) console.error(`Unknown numeric text ${text}`);
    return num;
}
