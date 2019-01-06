# mojLawSplit
將全國法規資料庫的 XML 檔切為許多小檔，存為 XML 與 JSON 。

本專案僅保留程式碼，實際資料檔請連向：
* [mojLawSplitXML](https://github.com/kong0107/mojLawSplitXML)
* [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON)
* [政府資料開放平台](https://data.gov.tw/datasets/search?qs=dtid:692+%E6%B3%95%E8%A6%8F)

## Files
* `xml/`: 切成小份的 XML 檔，除了 `index.xml` 為彙整，其餘每個檔均是一個法規。
  * `UpdateDate.txt`: 法規更新日期
  * `index.xml`: 彙整所有法規的基本資料，包含歷次舊名。根結點保留 `UpdateDate` 屬性。
  * `FalVMingLing/`: 中文法律與命令資料檔
  * `Eng_FalVMingLing/`: 英譯法律與命令資料檔
  * `HisMingLing/`: 歷史命令資料檔，依各法規的 `PCODE` 再分成各子資料夾。
* `json/`: 子目錄結構與 `xml/` 相同，但 `index.json` 不包含 `UpdateDate` 資訊。
* `json_arranged/`: 將法規資料重整後再存而成的 JSON 。
* `source/`: 從全國法規資料庫下載而來的 XML 檔，須手動放入。

## Usage & Update
1. 安裝 Node.js 。
2. 在目錄中執行 `npm install` 。
2. 從全國法規資料庫下載法規資料檔，解壓縮成各 XML 檔後，存於 source 目錄。
3. 執行指令 `node main.js` ，等待數分鐘。

## Advanced Usage
1. 建立 xml, json 子目錄，並均設為 git 儲存庫。
2. 執行 `./download.sh <date>` ，其中 `<date>` 是法規資料庫更新日。
3. 執行 `./update.sh <date>` ，其中 `<date>` 是法規資料庫更新日。

## Input Data Source
* 未包含所有命令，大多數自治條例與自治規則均未被包含。
* 未包含法律層級的修改紀錄。
* 條文中有排版用的換行。（本專案並未移除之）
* 檔首有三位元組的 BOM 。
* 偶爾會出現控制字元。

## Output

### XML
* 輸出檔沒有 XML 宣告 `<?xml ... ?>` ，亦無 BOM ；換行字元為 `\r\n` 。
* 輸出檔縮減了 XML 的縮排，但保留了 CDATA 中換行後的縮排。
* 保留了原始檔案中，沒有資料的標籤。
* 已移除原始檔案中的控制字元（換行字元除外）。

### JSON
* 移除了沒有資料的屬性，但保留空白的「編章節」。（見 H0170012 「公共藝術設置辦法」）
* 除了「法規內容」和「附件」外，各標籤均轉存為物件的字串成員。
* 「法規內容」中，為維持「編章節」和「條文」的順序，使用 [`xml2jsobj`](https://www.npmjs.com/package/xml2jsobj) 套件。
* 移除「編章節」標籤中的前置空白（ `xml2jsobj` 預設使用 `trim` ）。
* 「附件」未被官方的格式規範文件提及，已將其內的「下載網址」標籤轉存為字串陣列。

## Warning

全國法規資料庫自 2019-01-01 改版後，連結格式已有變化。
資料中許多網址均已失效，所幸都只是網址格式與變數名稱不同，因此還是有辦法找到資料。

## Development

### Files
* `main.js`: 主程式
* `xmlSplit.js`: 將 `source/*.xml` 切成各個小檔。可單獨執行。
* `xml2json.js`: 將各 XML 小檔轉存成 JSON 。可單獨執行，沒有被 `main.js` 使用。
* `saveSummary.js`: 將各 JSON 小檔摘要後存成 `json/index.json` 和 `xml/index.xml` 。可單獨執行。
* `lib`: 函式庫
  * `arrange.js`: 改寫法規物件結構。
  * `loadSplit.js`: 讀取各 XML 或 JSON 小檔。沒有被 `main.js` 使用。
  * `getFilePath.js`: 由法規資料決定檔案路徑。
  * `mapAsync.js`: `Array.prototype.map` 的非同步版本。
  * `mapDict.js`: 依照本程式用的物件結構，對各法規資料版本套用指定函式。
  * `parseXML.js`: 將單一法規的 XML 字串轉為 JS 物件。
  * `writeFile.js`: 將檔案寫入指定路徑。若路徑未存在就遞迴創建資料夾。
