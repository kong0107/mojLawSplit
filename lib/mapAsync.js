/**
 * Async version for `Array#map`
 * @module mapAsync
 * @param {Function} asyncFunc to execute for each element
 * @param {Array} [target=this]
 * @param {boolean} [skipReturn=false] to indicate whether to return the results
 * @returns {Promise} resolves to an array with the results, or undefined if `skipReturn` is set to true
 *
 * @example Direct use
 * mapAsync = require('mapAsync');
 * results = await mapAsync(asyncFunc, array);
 *
 * @example Set as a member function of `Array.prototype`
 * Array.prototype.mapAsync = require('mapAsync');
 * results = await array.mapAsync(asyncFunc);
 *
 * @example If you care about performance
 * Array.prototype.forEachAsync = require('mapAsync').forEachAsync;
 * array.forEachAsync(asyncFunc);
 */
const main = async function(
    asyncFunc,
    target = this,
    skipReturn = false
) {
    if(typeof asyncFunc !== 'function') throw new TypeError(`${asyncFunc} is not a function.`);
    if(typeof target.length === 'undefined') throw new TypeError('The target is not an array.');
    const result = [];
    for(let i = 0; i < target.length; ++i) {
        const item = await asyncFunc.call(target, target[i], i, target);
        if(!skipReturn) result.push(item);
    }
    return skipReturn ? undefined : result;
};

main.forEachAsync = async function(asyncFunc, target = this) {
    await main(asyncFunc, target, true);
};

module.exports = main;
