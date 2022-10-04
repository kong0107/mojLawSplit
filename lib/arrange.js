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
    law.isEng = !!law.EngLawURL;
    law.pcode = (law.LawURL || law.EngLawURL).slice(-8);
    const result = {pcode: law.pcode};
    for(let attr in law) {
        if(!law[attr]) continue;
        if(Array.isArray(law[attr]) && law[attr].length === 0) continue;
        if(["pcode", "isEng"].includes(attr)) continue;

        const parser = reassigner[attr];
        switch(typeof parser) {
            case "boolean":
                if(parser) result[attr] = law[attr];
                break;
            case "string":
                result[parser] = law[attr];
                break;
            case "function":
                Object.assign(result, parser(law[attr], law));
                break;
            default:
                console.error(`${law.pcode} has an unknown attribute ${attr}`);
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
        attachments[id] = obj.FileName.replace("\u3127", "\u4e00"); // 將注音「ㄧ」修正為中文「一」。
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

function enHistoriesParser(text) {
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
const charConvertList = [
    // Bopomofo: U+3100..U+312F
    {from: 0x3127, to: 0x4e00},
    {from: 0x3108, to: null, pcode: "D0080114"},

    // Private Use Area: U+E000..U+F8FF
    {from: 0xe347, to: 0x544b, pcode: "L0070039"},
    {from: 0xe347, to: 0x544b, pcode: "O0040062"},
    {from: 0xe347, to: 0x544b, pcode: "O0020072"},
    {from: 0xe347, to: 0x544b, pcode: "O0020070"},
    {from: 0xe347, to: 0x544b, pcode: "O0070006"},
    {from: 0xe347, to: 0x544b, pcode: "O0050023"},
    {from: 0xe347, to: 0x544b, pcode: "O0040019"},
    {from: 0xe347, to: 0x544b, pcode: "O0020044"},
    {from: 0xe347, to: 0x544b, pcode: "O0020037"},
    {from: 0xe347, to: 0x544b, pcode: "D0120029"},

    {from: 0xe38d, to: 0x62c5, pcode: "D0050183"},

    {from: 0xe39b, to: 0x7240, pcode: "J0020001"},
    {from: 0xe39b, to: 0x7240, pcode: "J0020008"},

    {from: 0xe3bb, to: 0x5efb, pcode: "K0010074"},
    {from: 0xe3d6, to: 0x82f7, pcode: "L0040092"},

    {from: 0xe42f, to: 0x5549, pcode: "L0040019"},
    {from: 0xe40b, to: 0x75b1, pcode: "M0130041"},
    {from: 0xe43d, to: 0x9eaf, pcode: "G0330017"},
    {from: 0xe460, to: 0x8117, pcode: "G0320027"},

    {from: 0xe4b5, to: 0x8148, pcode: "O0040057"},
    {from: 0xe4b5, to: 0x8148, pcode: "O0040062"},
    {from: 0xe4b5, to: 0x8148, pcode: "L0040027"},
    {from: 0xe4b5, to: 0x8148, pcode: "O0040004"},

    {from: 0xe4c7, to: 0x920e, pcode: "N0070017"},
    {from: 0xe4c7, to: 0x920e, pcode: "N0060014"},
    {from: 0xe4c7, to: 0x920e, pcode: "N0060006"},

    {from: 0xe4ed, to: 0x7145, pcode: "O0020068"},

    {from: 0xe52a, to: 0x734e, pcode: "P0030013"},
    {from: 0xe52a, to: 0x734e, pcode: "J0040053"},

    {from: 0xe53c, to: 0x7460, pcode: "M0100025"},

    {from: 0xe54a, to: 0x8fbd, pcode: "O0040059"},
    {from: 0xe54a, to: 0x8fbd, pcode: "O0040060"},
    {from: 0xe54a, to: 0x8fbd, pcode: "O0040061"},
    {from: 0xe54a, to: 0x8fbd, pcode: "O0110018"},
    {from: 0xe54a, to: 0x8fbd, pcode: "O0040004"},

    {from: 0xe591, to: 0x8e2a, pcode: "S0010020"},
    {from: 0xe591, to: 0x8e2a, pcode: "M0020033"},
    {from: 0xe591, to: 0x8e2a, pcode: "K0010071"},
    {from: 0xe591, to: 0x8e2a, pcode: "K0010046"},

    {from: 0xe595, to: 0x918c, pcode: "L0040027"},

    {from: 0xe5bd, to: 0x763b, pcode: "I0040070"},
    {from: 0xe5bd, to: 0x763b, pcode: "I0040071"},

    {from: 0xe5f9, to: 0x87ce, pcode: "M0140001"},
    {from: 0xe5f9, to: 0x87ce, pcode: "O0060001"},
    {from: 0xe5f9, to: 0x87ce, pcode: "L0040027"},
    {from: 0xe5f9, to: 0x87ce, pcode: "M0140011"},

    {from: 0xe675, to: 0x7ac8, pcode: "D0070109"},

    {from: 0xe694, to: 0x9c3a, pcode: "M0050068"},
    {from: 0xe694, to: 0x9c3a, pcode: "M0050046"},

    {from: 0xe6bb, to: 0x6004, pcode: "M0050010"},
    {from: 0xe770, to: 0x5c1e, pcode: "D0140009"},

    {from: 0xe8fa, to: 0x4f1a, pcode: "M0050052"},
    {from: 0xe8fa, to: 0x4f1a, pcode: "M0050057"},
    {from: 0xe8fa, to: 0x4f1a, pcode: "M0050058"},
    {from: 0xe8fa, to: 0x4f1a, pcode: "M0050060"},
    {from: 0xe8fa, to: 0x4f1a, pcode: "M0050062"},

    {from: 0xe968, to: 0x4fe5, pcode: "R0040039"},
    {from: 0xec75, to: 0x6c39, pcode: "Q0010003"},
    {from: 0xeef0, to: 0x80bd, pcode: "M0130025"},
    {from: 0xef03, to: 0x7551, pcode: "D0060030"},
    {from: 0xef7f, to: 0x7cac, pcode: "G0330001"},

    {from: 0xf4e9, to: 0xd7, pcode: "O0110022"},
    {from: 0xf6f6, to: 0xd7, pcode: "N0060030"},

];


/**
 * 處理編章節標題和各條文。
 * 因為要分析各編章節的條號範圍，所以必須一起處理。
 * @param {Array} arr 原始資料中的「法規內容」結構化資料
 * @param {string} lang
 */
function contentParser(arr, law) {
    const {pcode, isEng} = law;
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

                /**
                 * 條文內容
                 */
                let text = (item.ArticleContent || item.EngArticleContent).trim();

                if(isEng) {
                    if(pcode === "A0030123") text = text.replace("\ue5b8", "");
                    if(pcode === "O0020006") text = text.replace("\uee6d", "");
                    if(pcode === "D0070051") text = text.replace("\x7f", "");
                    if(pcode === "F0010032") text = text.replace(" 綜s", "");
                    if(pcode === "N0010008") text = text.replace(" (unintelligible!?)", "");
                    if(["K0060138", "K0060139"].includes(pcode)) text = text.replace("\u4efb", "");

                    if(pcode === "G0420007") text = text.replace("!|", "\u2019");
                    if(pcode === "K0110026") text = text.replace("\x21\xa7", "\u201c").replace("\x21\u2025", "\u201d");
                    if(pcode === "K0080008") text = text.replace("\x49\u8a6c", "into").replace("\u8a70", ",");

                    if(pcode === "B0010001") text = text.replaceAll("\u5daa", "\xe9\x65");
                    if(pcode === "G0340087") text = text.replaceAll("條號：", "article ");
                    if(pcode === "F0150016") text = text.replaceAll("\uee98\x42", ".").replaceAll("\uee98\x5d", "(").replaceAll("\uee98\x5e", ")");

                    let pos;
                    if((pcode === "D0120029" && (pos = text.indexOf("條號")) > 0)
                        || (pcode === "K0100005" && (pos = text.indexOf("\r\nCriteria for accreditation of the observation instruments")) > 0)
                        || (["G0440002", "G0440009"].includes(pcode) && (pos = text.indexOf("〔Remarks:")) > 0)
                        || (["B0000007", "C0010008"].includes(pcode) && (pos = text.indexOf("\r\nTranslated into English by")) > 0)
                    ) text = text.substring(0, pos);
                }
                else {
                    // if( (pcode === "T0020025" && number === 3500)
                    //     || (pcode === "R0040020" && number === 1200)
                    //     || (pcode === "R0030085" && number === 100)
                    //     || (pcode === "O0050027" && number === 3000)
                    // )
                    text = text.replaceAll(/[\ue144-\ue2cc]+(\r\n|$)/g, "");

                    if(pcode === "R0030026" && number === 200) {
                        text = text
                            .replace(/[\ue257-\ue25e]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xe257 + 0xe2460))
                            .replace(/[\ue1a5-\ue1a8]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xe1a5 + 0xe2776))
                        ;
                    }
                    if( (pcode === "D0060018" && number === 1300)
                        || (pcode === "J0040021" && number === 300)
                        || (pcode === "L0070020" && number === 300)
                        || (pcode === "L0060038" && number === 900)
                        || (pcode === "J0030002" && number === 1500)
                        || (pcode === "L0060035")
                        || (pcode === "L0070019")
                    ) {
                        text = text
                            .replace(/[\uf6b1-\uf6b8]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xf6b1 + 0xe2460))
                            .replace(/[\uf6bb-\uf6bd]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xf6bb + 0xe2776))
                        ;
                    }

                    charConvertList.forEach(rule => {
                        if(rule.pcode && rule.pcode !== pcode) return;
                        text = text.replaceAll(
                            String.fromCharCode(rule.from),
                            rule.to ? String.fromCharCode(rule.to) : ""
                        );
                    });
                }
                text = text.trim();
                // const validation = textValidate(text, law);
                // if(!validation) throw new Error(number);
                console.assert(textValidate(text, law), number);

                const content = text;

                // Translated into English by

                articles.push({
                    number,
                    content,
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
                        number, title: title.trim(),
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


const allowedEnPunctuations = [
                                                                0x09, 0x0a, 0x0d,
    0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f,
                                                                0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f,
                                                                      0x5b, 0x5c, 0x5d, 0x5e,
    0x60,                                                             0x7b,       0x7d, 0x7e,
    0xa7, 0xb0, 0xb1, 0xb7, 0xd7, 0xf7, 0xe9,

    0x0394, 0x0399, 0x03a0, 0x03a3, 0x03a9, 0x03b1, 0x03b2, 0x03bc, 0x03c0, 0x03c1, 0x03c4,
    0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2027, 0x2103,
    0x2160, 0x2161, 0x2162, 0x2163, 0x2164, 0x2165, 0x2166, 0x2167, 0x2168, 0x2169, // 羅馬數
    0x221a, 0x221e, 0x222b, 0x2266, 0x2267,
    0x2500, 0x2502, 0x250c, 0x2510, 0x2514, 0x2518, 0x251c, 0x2524, 0x252c, 0x2534, 0x253c, // I0040003 框線
    0x256d, 0x256e, 0x256f, 0x2570, 0x25b3, 0x25cb,

    0x3000, 0x3001, 0x3002, 0x3008, 0x3009, 0x300d, 0x300f,
    0x3010, 0x3011, 0x3014, 0x3015, 0x301d, 0x301e,
    0x33a1,
    // 0x4e00, 0x4e8c, 0x4e09, 0x56db, 0x4e94, 0x516d, 0x4e03, 0x516b, 0x4e5d, 0x5341, // 中文數字
    // 0x505c, 0x5e74, // F0030002 「停年」
    // 0x52a0, 0x6cb9, // K0070059 「加油」
    // 0x5713, 0x9280, 0x5143, // G0380048 「銀圓」、「元」
    // 0x5f85, 0x67e5, // K0070028 「待查」
    // 0x7a2e, 0x82d7, // M0030024 「種苗」

    0xfe5d, 0xfe5e,
    0xff04, 0xff05, 0xff06, 0xff08, 0xff09, 0xff0a, 0xff0b, 0xff0c, 0xff0d, 0xff0e, 0xff0f,
    0xff10, 0xff11, 0xff12, 0xff13, 0xff14, 0xff15, 0xff16, 0xff17, 0xff18, 0xff19, // 全形數
    0xff1a, 0xff1b, 0xff1c, 0xff1d, 0xff1e, 0xff1f,
    0xff22, 0xff2d, 0xff2e, 0xff2f, 0xff30, 0xff31, 0xff35, 0xff36, 0xff37, // 全形英
    0xff38, 0xff3c, 0xff58, 0xff5e, 0xffe1
];
// console.log(allowedEnPunctuations.map(c => String.fromCharCode(c)).join(""));
const reEnValid = new RegExp(
    "["
    + allowedEnPunctuations.map(c => (c < 0x100)
        ? ("\\x" + c.toString(16).padStart(2, "0"))
        : ("\\u" + c.toString(16).padStart(4, "0"))
    ).join("")
    + "\\w\\u4e00-\\u9fff]+",
    "g"
);
// console.log(reEnValid);


const allowedChPunctuations = [
    0x09, 0x0a, 0x0d, // \t, \n, \r
    0xa7, 0xb0, 0xb1, 0xb3, 0xd7, 0xf7, // Latin-1 Supplement: U+0080..U+00FF
    0x02c7, 0x02cd, 0x02d9, // IPA Extensions: U+0250..U+02AF

    // Greek and Coptic: U+0370..U+03FF
    0x0394, 0x039b, 0x039f,
    0x03a3, 0x03a8, 0x03a9,
    0x03b1, 0x03b4, 0x03b8, 0x03b2, 0x03b3, 0x03b9, 0x03bb, 0x03bc, 0x03bd,
    0x03c0, 0x03c1, 0x03c3, 0x03c4, 0x03c6, 0x03c8, 0x03c9,

    // General Punctuation: U+2000..U+206F
    0x2013, 0x2014, 0x2019, 0x201c, 0x201d, 0x2026, 0x2027, 0x2032, 0x203b,

    0x2103, // Letterlike Symbols: U+2100..U+214F

    0x2215, 0x221a, 0x221e, 0x2223, 0x222b, 0x222e, 0x2266, 0x2267, // Mathematical Operators: U+2200..U+22FF
    // 0x2460, 0x2461, 0x2462, // Circled Digit (added by this project)
    0x25a1, 0x25b3, 0x25cb, // Geometric Shapes: U+25A0..U+25FF
    // 0x2776, 0x2777, 0x2778, // Dingbat Negative Circled Digit (added by this project)

    0x32a3, // Enclosed CJK Letters and Months: U+3200..U+32FF
    0x338e, 0x338f, 0x339c, 0x339d, 0x33a1, 0x33d2, // CJK Compatibility: U+3300..U+33FF
    0xfe30, 0xfe35, 0xfe36, 0xfe41, 0xfe42, // CJK Compatibility Forms: U+FE30..U+FE4F
    0xfe50, 0xfe5d, 0xfe5e, 0xfe66, 0xfe68, // Small Form Variants: U+FE50..U+FE6F
    0xfe51, 0xfe54, 0xfe55, 0xfe59, 0xfe5a, 0xfe62, 0xfe66, // Small Form Variants: U+FE50..U+FE6F
];
// console.log(allowedChPunctuations.map(c => String.fromCharCode(c)).join(""));
const reChValid = new RegExp(
    "["
    + allowedChPunctuations.map(c => (c < 0x100)
        ? ("\\x" + c.toString(16).padStart(2, "0"))
        : ("\\u" + c.toString(16).padStart(4, "0"))
    ).join("")
    + "\\x20-\\x7e" // ASCII printable characters
    + "\\u2160-\\u2169" // Roman Numeral One to Ten
    + "\\u2460-\\u2469" // Circled Digit (added by this project)
    + "\\u2500-\\u257f" // Box Drawing
    + "\\u2776-\\u277f" // Dingbat Negative Circled Digit (added by this project)
    + "\\u3000-\\u3002\\u3008-\\u3011\\u3014\\u3015" // partial of CJK Symbols and Punctuation (U+3300..U+33FF)
    + "\\u4e00-\\u9fff" // CJK Unified Ideographs
    + "\\uff01-\\uff5e" // Fullwidth Forms of ASCII printable characters
    + "]+",
    "g"
);
// console.log(reChValid);

function textValidate(text, law) {
    let shallBeEmpty;
    if(law.isEng) shallBeEmpty = text.replaceAll(reEnValid, "");
    else shallBeEmpty = text.replaceAll(reChValid, "");
    if(!shallBeEmpty) return true;
    console.error("unknown charcter", law.pcode, shallBeEmpty, shallBeEmpty.charCodeAt(0).toString(16));
    return false;
}
