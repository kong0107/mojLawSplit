Array.prototype.mapAsync = require('./mapAsync')

/**
 * 遍歷 dict
 * [{
 *   pcode: string,
 *   chinese: string,
 *   english: string,
 *   history[]: {
 *	   lnndate: string,
 *     lser: string,
 *     data: any
 *	 }
 * }]
 */
module.exports = async (asyncFunc, dict) =>
    await dict.mapAsync(async (dictItem, counter) => {
        if(!(counter % 100)) process.stdout.write('.');
        if(counter === dict.length - 1) process.stdout.write('\n');

        const pcode = dictItem.pcode;
        const result = {
            pcode: dictItem.pcode,
            chinese: await asyncFunc(dictItem.chinese, pcode, 'chinese')
        };
        if(dictItem.english) result.english = await asyncFunc(dictItem.english, pcode, 'english');
        result.history = await dictItem.history.mapAsync(async hisItem => {
            const data = await asyncFunc(hisItem.data, pcode, 'history', hisItem.lnndate, hisItem.lser);
            const result = Object.assign({}, hisItem, {data});
            return result;
        });

        return result;
    })
;
