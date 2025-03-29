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
    'LawName': lawNameParser, // 雙語都有
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

function lawNameParser(text) {
    return {name: text.replace(/（([新舊]\x20)?\d+\.\d+\.\d+\s*[制訂]定）$/, "")};
}

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
    // 中文版裡的錯別字
    {from: 0x3127, to: 0x4e00}, // 注音「ㄧ」轉為中文「一」
    {from: 0x3108, to: null, pcode: "D0080114"}, // 多餘的「ㄈ」

    // 英文版裡的錯別或贅字
    {from: 0x7f, to: null, pcode: "D0070051"},
    {from: 0xffe1, to: 0x2266, pcode: "O0020006"}, // 應為數學符號，卻成為英鎊符號；另注意英鎊符號有被 G0360001 用到。
    {from: 0xe5b8, to: null, pcode: "A0030123"},
    {from: 0xee6d, to: null, pcode: "O0020006"},

    // 符號統一，以避免用一般標點判讀時出錯。
    {from: 0x02cd, to: 0xff3f, pcode: "I0050029"}, // I0050029
    {from: 0x02d9, to: 0xff0e}, // 小數點、間格號 // D0070209, O0040031, ...
    {from: 0x2027, to: 0xff0e}, // 小數點、間格號
    {from: 0xfe30, to: 0xff1a},
    {from: 0xfe50, to: 0xff0c},
    {from: 0xfe51, to: 0x3001},
    {from: 0xfe54, to: 0xff1b},
    {from: 0xfe55, to: 0xff1a},
    {from: 0xfe59, to: 0xff08},
    {from: 0xfe5a, to: 0xff09},
    {from: 0xfe62, to: 0xff0b},
    {from: 0xfe66, to: 0xff1d},

    // Private Use Area: U+E000..U+F8FF
    {from: 0xe027, to: 0x6bd2, pcode: "M0060003"}, // ??
    {from: 0xe0d3, to: 0x207b, pcode: "O0020037"},
    {from: 0xe0e3, to: 0x2079, pcode: "O0020037"},
    {from: 0xe0dc, to: 0x27, pcode: "O0020006"}, // 查到官方 PDF 檔裡面是用單引號來表示 prime
    {from: 0xe15d, to: 0x79bd, pcode: "J0010006"}, // ??
    {from: 0xe1ca, to: null, pcode: "D0010001"}, // ??
    {from: 0xe1d9, to: 0x6490, pcode: "K0070007"}, // ??
    {from: 0xe286, to: 0x98df, pcode: "J0090015"}, // ??
    {from: 0xe2c2, to: 0x221a, pcode: "D0060020"},
    {from: 0xe260, to: 0x221a, pcode: "D0060006"},
    // {from: 0xe2d1, to: null, pcode: "K0080036"},
    {from: 0xe347, to: 0x544b},
    {from: 0xe355, to: 0x5e92, pcode: "H0170004"},
    {from: 0xe38d, to: 0x62c5},
    {from: 0xe39b, to: 0x7240},
    {from: 0xe3bb, to: 0x5efb},
    {from: 0xe3d6, to: 0x82f7},
    {from: 0xe400, to: 0x7159, pcode: "K0070019"},
    {from: 0xe42f, to: 0x5549},
    {from: 0xe40b, to: 0x75b1},
    {from: 0xe43d, to: 0x9eaf},
    {from: 0xe460, to: 0x8117},
    {from: 0xe4b5, to: 0x8148},
    {from: 0xe4cc, to: 0x50cd, pcode: "M0130018"},
    {from: 0xe4c7, to: 0x920e},
    {from: 0xe4d5, to: 0x9e7d, pcode: "J0110003"},
    {from: 0xe4ed, to: 0x7145},
    {from: 0xe4f7, to: 0x7919}, // 原為異體字「碍」 (`U+788D`) ，參考同法規第261條，轉為「礙」。
    {from: 0xe52a, to: 0x734e}, // 原為異體字「奬」 (`U+596C`) ，轉換為常用字「獎」。
    {from: 0xe53c, to: 0x7460},
    {from: 0xe53f, to: 0x78b1}, // J0030027, D0070012
    {from: 0xe54a, to: 0x8fbd},
    {from: 0xe591, to: 0x8e2a},
    {from: 0xe595, to: 0x918c},
    {from: 0xe5bd, to: 0x763b},
    {from: 0xe5f0, to: 0x7647, pcode: "I0040033"},
    {from: 0xe5f9, to: 0x87ce},
    {from: 0xe643, to: 0x8262, pcode: "K0070035"},
    {from: 0xe675, to: 0x7ac8},
    {from: 0xe694, to: 0x9c3a},
    {from: 0xe6bb, to: 0x6004},
    {from: 0xe770, to: 0x5c1e},
    {from: 0xe804, to: 0x4f, pcode: "J0040021"},
    {from: 0xe838, to: 0x9176, pcode: "L0030041"}, // ??
    {from: 0xe8fa, to: 0x4f1a},
    {from: 0xe83a, to: 0x82f7, pcode: "L0030040"}, // ??
    {from: 0xe83a, to: 0x82f7, pcode: "L0030041"}, // ??
    {from: 0xe83d, to: 0x80bd, pcode: "L0030040"}, // ??
    {from: 0xe83d, to: 0x80bd, pcode: "L0030041"}, // ??
    {from: 0xe85e, to: 0x87ce, pcode: "O0050008"}, // ??
    {from: 0xe968, to: 0x4fe5},
    {from: 0xea03, to: 0x20, pcode: "G0400078"},
    {from: 0xeb89, to: null, pcode: "G0330018"},
    {from: 0xec75, to: 0x6c39},
    {from: 0xecc7, to: 0x6d, pcode: "J0040021"},
    {from: 0xed45, to: 0x5238}, // 原為異體字「劵」 (`U+52B5`) ，轉換為常用字「券」。
    {from: 0xee98, to: 0x73d0, pcode: "J0030018"},
    {from: 0xeef0, to: 0x80bd},
    {from: 0xef03, to: 0x7551},
    {from: 0xef7f, to: 0x7cac},
    {from: 0xf1e6, to: 0x945b, pcode: "J0010001"},
    {from: 0xf26d, to: null, pcode: "G0400109"},
    {from: 0xf26d, to: null, pcode: "G0400104"},
    {from: 0xf4e9, to: 0xd7},
    {from: 0xf6cf, to: 0x2026, pcode: "D0060054"},
    {from: 0xf6e9, to: 0xff3e, pcode: "F0090006"}, // ??
    {from: 0xf6f2, to: 0x25cb, pcode: "F0130001"},
    {from: 0xf6f6, to: 0xd7, pcode: "N0060030"},
    {from: 0xf6f6, to: 0xff0a, pcode: "K0070038"},
    {from: 0xf67d, to: null, pcode: "O0000007"},
    {from: 0xf67e, to: null, pcode: "O0000007"},
    {from: 0xf819, to: 0x2032, pcode: "K0070038"},
    {from: 0xf81a, to: 0x2032, pcode: "F0090006"},
    {from: 0xf43e, to: null, pcode: "G0330019"},
    {from: 0xf43e, to: null, pcode: "G0400110"},
    {from: 0xf829, to: null, pcode: "K0040047"},
];

const articleDivisionDetectors = [
    /^第([一二三四五六七八九十]+)類：/,
    /^[一二三四五六七八九十]+[\u3000、\x20]/,
    /^(\s?\(|（)[一二三四五六七八九十]+(）|\)\s?)/,
    /^\s*\d+[\x20\x2e]/,
    /[\u2460-\u2473]/, // Cicled Digits 1~20
    /[\u2776-\u277f]/, // Dingbat Negative Circled Digits 1~10
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
                let number;
                if (match) number = parseInt(match[1]) * 100 + (match[2] ? parseInt(match[3]) : 0);
                else if (pcode === 'K0090030') number = 100;
                console.assert(number, pcode, JSON.stringify(item));

                /**
                 * 條文內容
                 */
                let text = (item.ArticleContent || item.EngArticleContent);
                let content;

                if(isEng) {
                    // 單純移除
                    if(pcode === "F0010032") text = text.replace(" 綜s", "");
                    if(pcode === "N0010008") text = text.replace(" (unintelligible!?)", "");

                    // 只換一次
                    if(pcode === "G0420007") text = text.replace("!|", "\u2019");
                    if(pcode === "K0110026") text = text.replace("\x21\xa7", "\u201c").replace("\x21\u2025", "\u201d");
                    if(pcode === "K0080008") text = text.replace("\x49\u8a6c", "into").replace("\u8a70", ",");
                    if(["K0060138", "K0060139"].includes(pcode)) text = text.replace("\u4efb", " ");

                    // 換多次
                    if(pcode === "B0010001") text = text.replaceAll("\u5daa", "\xe9\x65");
                    if(pcode === "G0340087") text = text.replaceAll("條號：", "article ");
                    if(pcode === "F0150016") text = text.replaceAll("\uee98\x42", ".").replaceAll("\uee98\x5d", "(").replaceAll("\uee98\x5e", ")");
                    if(pcode === "G0400122") text = text.replaceAll("?\uea03 ", "'s ");

                    // 單純移除
                    let pos;
                    if((pcode === "D0120029" && (pos = text.indexOf("條號")) > 0)
                        || (pcode === "K0100005" && (pos = text.indexOf("\r\nCriteria for accreditation of the observation instruments")) > 0)
                        || (["G0440002", "G0440009"].includes(pcode) && (pos = text.indexOf("〔Remarks:")) > 0)
                        || (["B0000007", "C0010008"].includes(pcode) && (pos = text.indexOf("\r\nTranslated into English by")) > 0)
                    ) text = text.substring(0, pos);
                }
                else {
                    text = text
                        .replaceAll(/[\ue144-\ue2cc]+(\r\n|$)/g, "") // T0020025, K0020027 等，在換行前有奇怪的字碼
                        .replaceAll("：、", "：\x20\x20") // T0010001, F0130002
                        .replaceAll("。、", "。\x20\x20")
                        .replace(/\ued79(\r\n)?/, "\r\n") // O0050071, G0400116, G0400105
                        .replace("\ue2d1", "\r\n") // K0080036, D0080106
                    ;

                    /// 圓圈數字
                    if(pcode === "R0030026" && number === 200) {
                        text = text
                            .replace(/[\ue257-\ue25e]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xe257 + 0xe2460))
                            .replace(/[\ue1a5-\ue1a8]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xe1a5 + 0xe2776))
                        ;
                    }
                    else if( (pcode === "D0060018" && number === 1300)
                        || (pcode === "J0040021" && number === 300)
                        || (pcode === "L0070020" && number === 300)
                        || (pcode === "L0060038" && number === 900)
                        || (pcode === "J0030002" && number === 1500)
                        || (pcode === "L0060035")
                        || (pcode === "L0070019")
                    ) {
                        text = text
                            .replace(/[\uf6b1-\uf6b9]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xf6b1 + 0xe2460))
                            .replace(/[\uf6bb-\uf6bd]/g, m => String.fromCharCode(m[0].charCodeAt(0) - 0xf6bb + 0xe2776))
                        ;
                    }

                    /// 針對特定資料的修正
                    if(pcode === "M0050051" && number === 3400)
                        text = text.replace("三、海洋漁業生物多樣性之調查\r", "三、海洋漁業生物多樣性之調查。\r");
                }
                charConvertList.forEach(rule => {
                    if(rule.pcode && rule.pcode !== pcode) return;
                    text = text.replaceAll(
                        String.fromCharCode(rule.from),
                        rule.to ? String.fromCharCode(rule.to) : ""
                    );
                });

                text = text.replaceAll(/[\x20\u3000]+(\r\n|$)/g, "$1"); // remove trailing spaces of each line.
                console.assert(textValidate(text, law), number);

                if(isEng) content = text.trimEnd();
                else if(/[\u2500-\u257f]/.test(text)
                    || /公式如[左下]/.test(text)
                    || /[左下]列公式/.test(text)
                ) {
                    content = [{table: text}];
                }
                else {
                    /**
                     * 把項款目拆開。
                     * 有些施行中的行政命令也未必以冒號或句號結尾，例如 D0010001 §12 ，
                     * 因此不適合用 /[：。]\r\n/ 判斷每個項款目的結束。
                     * 故反過來，先用 "\r\n" 切開，再視後方是否是下一層列表。
                     */
                    const flat = text.trim().split("\r\n").reduce((acc, line) => {
                        line = line.trim();
                        const depth = articleDivisionDetectors.findIndex(re => re.test(line));
                        const prev = acc[acc.length - 1];
                        if(prev && (!/[：。]$/.test(prev.text) && depth === -1
                            || (pcode === "T0020021" && number === 2800)
                            || (pcode === "F0010007" && number === 14700)
                            || (pcode === "J0090022" && number === 2704 && depth !== -1)
                            || (pcode === "F0090006" && number === 19000 && line.startsWith("七"))
                        )) {
                            prev.text += line;
                            return acc;
                        }
                        acc.push({text: line, depth});
                        return acc;
                    }, []);

                    content = [];
                    flat.forEach((line, index) => {
                        line.text = line.text.trim();
                        if(!index) line.depth = -1; // 例如 A0000005
                        if(line.depth < 0) {
                            // 針對所得稅法第14條
                            if(pcode === "G0340003" && number === 1400) {
                                const catLength = flat[0].children?.filter(line => line.depth === 0).length;
                                if(catLength < 10) {
                                    const catIndex = flat.findLastIndex((another, anIndex) => anIndex < index && another.depth === 0);
                                    const category = flat[catIndex];
                                    if(category.children) {
                                        if(line.text.startsWith("退職服務年資")) category.children[0].postText = line.text;
                                        else category.postText = line.text;
                                    }
                                    else category.text += "\n" + line.text;
                                    line.depth = NaN; // 避免被後面的當成父層
                                    return;
                                }
                            }
                            content.push(line);
                            return;
                        }
                        const parent = flat.findLast((another, anIndex) => anIndex < index && another.depth < line.depth);
                        console.assert(parent, pcode, number, content, flat);
                        parent.children = parent.children || [];
                        parent.children.push(line);
                    });
                    flat.forEach(line => delete line.depth);
                }
                // content = text.trimEnd();

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
                            const match = text.match(/^\s*第\s*([零一二三四五六七八九十百]+)\s*([編章節款目])(之([一二三四五六七八九十]+))?\s*(.+)\s*$/);
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
                        else if(pcode === 'K0090041') type = "section";
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

const reValid = new RegExp("["
    + "\\t\\n\\r"
    + "\\x20-\\x7e" // printable ASCII
    + "\\xa1-\\xff" // printable Latin-1 Supplement
    + "\\u02c7" // 注音的三聲，用於打勾。
    + "\\u0391-\\u03a9\\u03b1-\\u03c9" // Greek alphabets
    + "\\u2012-\\u201f\\u2027\\u2030-\\u203c\\u2026" // General Punctuation: U+2000..U+206F
    + "\\u2070-\\u207f\\xb2\\xb3\\xb9" // Superscripts
    + "\\u2103" // 攝氏溫標 (in Letterlike Symbols: U+2100..U+214F)
    + "\\u2160-\\u216B" // Roman Numbers: 1~12
    + "\\u2200-\\u22ff" // Mathematical Operators: U+2200..U+22FF
    + "\\u2460-\\u2473" // Cicled Digits 1~20
    + "\\u2500-\\u257F" // Box Drawing: U+2500..U+257F
    + "\\u25a0-\\u25cf" // Geometric Shapes (partial)
    + "\\u2776-\\u277f" // Dingbat Negative Circled Digits 1~10
    + "\\u3000-\\u3002\\u3008-\\u301f" // partial of CJK Symbols and Punctuation (U+3300..U+33FF)
    + "\\u32a3" // 圓圈裡的「正」 (in Enclosed CJK Letters and Months: U+3200..U+32FF)
    + "\\u3380-\\u33df" // CJK Squared Abbreviations: U+3380–U+33FF
    + "\\u4e00-\\u9fff" // CJK Unified Ideographs
    + "\\ufe35\\ufe36\\ufe41\\ufe42" // 直行括號 (in CJK Compatibility Forms: U+FE30..U+FE4F)
    + "\\ufe5d\\ufe5e\\ufe53\\ufe68" // 中括號與斜線 (in Small Form Variants: U+FE50..U+FE6F)
    + "\\uff01-\\uff5e" // Fullwidth Forms of ASCII printable characters
    + "\\uffe1" // 英鎊， only in G0360001
+ "]+", "g");

function textValidate(text, law) {
    const shallBeEmpty = text.replaceAll(reValid, "");
    if(!shallBeEmpty) return true;
    console.error("unknown character", law.pcode, shallBeEmpty, shallBeEmpty.charCodeAt(0).toString(16));
    return false;
}


/**
 * @typedef Article
 * @property {integer} number
 * @property {Array.<ArticleDivision>} paras
 */
/**
 * @typedef ArticleDivision
 * @property {string} text
 * @property {Array.<ArticleDivision>} children
 */
