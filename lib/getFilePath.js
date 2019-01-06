/**
 * 決定檔案路徑
 * 這還不是完整路徑，要再加上前面的母資料夾名稱及最後的副檔名。
 */
module.exports = (pcode, category, lnndate, lser) => {
	switch(category) {
		case 'chinese': return 'FalVMingLing/' + pcode;
		case 'english': return 'Eng_FalVMingLing/' + pcode;
		case 'history': return `HisMingLing/${pcode}/${lnndate}_${lser}`;
		default: throw new RangeError('Unknown category of dictItem');
	}
}
