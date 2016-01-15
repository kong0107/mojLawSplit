# mojLawSplit
將全國法規資料庫的 XML 檔切為許多小檔，存為 XML 與 JSON 。

本專案僅保留程式碼，實際資料檔請連向：
* [mojLawSplitXML](https://github.com/kong0107/mojLawSplitXML)
* [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON)

## Files
* `xml/`: 切成小份的 XML 檔，每個檔均是一個法規。
  * `UpdateDate.txt`: 法規更新日期
  * `FalV/`: 中文法律資料檔
  * `MingLing/`: 中文命令資料檔
  * `Eng_FalV/`: 英譯法律資料檔
  * `Eng_MingLing/`: 英譯命令資料檔
  * `HisMingLing/`: 歷史命令資料檔，依各法規的 `PCODE` 再分成各子資料夾。
* `json/`: 子目錄結構與 `xml/` 相同。
* `source/`: 從全國法規資料庫下載而來的 XML 檔，須手動放入。

## Usage & Update
1. 安裝 Node.js 。
2. 在目錄中執行 `npm install` 。
2. 從[全國法規資料庫](http://law.moj.gov.tw/PublicData/DevelopGuide.aspx)下載法規資料檔，解壓縮成各 XML 檔後，存於 source 目錄。
3. 執行指令 `npm start` 。（如無 `bash` ，請執行 `node main.js` ）

## Details
* 本專案「沒有」處理條文中的換行問題。
* 原始檔中除了 BOM 外，另有一些奇怪的控制字元，例如「危險性機械及設備安全檢查規則」英文版第四條的結尾處。（[全國法規資料庫的網頁](http://law.moj.gov.tw/Eng/LawClass/LawAll.aspx?PCode=N0060039)亦是如此）

### Aout the Data Source
* 未包含所有命令，大多數自治條例與自治規則均未被包含。
* 未包含法律層級的修改紀錄。

### XML
* 輸出檔沒有 XML 宣告 `<?xml ... ?>` ，亦無 BOM 。
* 輸出檔縮減了 XML 的縮排，但保留了 CDATA 中換行後的縮排。
* 保留原始檔案中，沒有資料的標籤。
* 已移除原始檔案中的控制字元（換行字元除外）。

### JSON
* 移除了沒有資料的屬性。
* 除了「法規內容」和「附件」外，各標籤均轉存為物件的字串成員。
* 「法規內容」中，為維持「編章節」和「條文」的順序，使用 [`xml2jsobj`](https://www.npmjs.com/package/xml2jsobj) 套件。
* 「附件」未被官方的格式規範文件提及，已將其內的「下載網址」轉存為字串陣列。
