const fsP = require('fs').promises;
const path = require('path');

Array.prototype.mapAsync = require('./mapAsync');
Array.prototype.forEachAsync = require('./mapAsync').forEachAsync;

/**
 * 讀取已經切好的資料。
 * @param {string} type 'xml' or 'json'
 * @param {function} [parser] an async or sync function by which each file is parsed
 */
module.exports = async (type, parser) => {
    const readFile = path => fsP.readFile(`./${type}/${path}`, 'utf8');
    const dict = [];

    await [
        {lang: 'chinese', path: 'FalVMingLing'},
        // {lang: 'english', path: 'Eng_FalVMingLing'}
    ].forEachAsync(async info => {
        console.log(`Loading ${info.path}`);
        const files = await fsP.readdir(`./${type}/${info.path}`);
        await files.forEachAsync(async (file, counter) => {
            if(!(counter % 100)) process.stdout.write('.');
            if(path.extname(file) != `.${type}`) return;
            const pcode = path.basename(file, `.${type}`);
            let dictItem = dict.find(item => item.pcode === pcode);
            if(!dictItem) dict.push(dictItem = {
                pcode: pcode,
                history: []
            });
            let text = await readFile(`${info.path}/${file}`);
            dictItem[info.lang] = parser ? (await parser(text)) : text;
        });
        process.stdout.write('\n');
    });

    // console.log('Loading history');
    // const pcodes = await fsP.readdir(`./${type}/HisMingLing`);
    // await pcodes.forEachAsync(async (pcode, counter) => {
    //     if(!(counter % 100)) process.stdout.write('.');
    //     const dictItem = dict.find(item => item.pcode === pcode);
    //     if(!dictItem) throw new ReferenceError(`孤立的歷史法規 ${pcode}`);
    //     const files = await fsP.readdir(`./${type}/HisMingLing/${pcode}`);
    //     dictItem.history = await files.mapAsync(async file => {
    //         const [, lnndate, lser] = file.match(/^(\d{8})_(\d{3})/);
    //         let data = await readFile(`HisMingLing/${pcode}/${file}`);
    //         if(parser) data = await parser(data);
    //         return {lnndate, lser, data};
    //     });
    // });
    // process.stdout.write('\n');

    console.log('Files loaded');
    return dict;
}
