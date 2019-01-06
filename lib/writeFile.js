/**
 * 寫檔
 * @module writeFile
 */
'use strict';
const fsP = require('fs').promises;
const path = require('path');

/**
 * 非同步地寫入檔案，且會會先創建其所在資料夾。
 * @param {string} file 檔案完整路徑
 * @param {string} data 要寫入的資料
 * @returns {Promise}
 */
module.exports = async (file, data) => {
	await fsP.mkdir(path.dirname(file), {recursive: true});
	await fsP.writeFile(file, data);
	return;
};
