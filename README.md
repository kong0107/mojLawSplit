# mojLawSplit
將全國法規資料庫的 XML 和 JSON 切為許多小檔，存為 XML 與 JSON 。

本專案僅保留程式碼，實際資料檔請連向：
* [mojLawSplitXML](https://github.com/kong0107/mojLawSplitXML) （從舊版 XML 切出來）
* [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON) （從舊版 XML 切出來後轉換）
* [mojLawSplitJSON 重整版](https://github.com/kong0107/mojLawSplitJSON/tree/arranged) （從新版 JSON 切出來後轉換）


## 資料來源
* [政府資料開放平台](https://data.gov.tw/datasets/search?query=%E6%B3%95%E8%A6%8F) （官方舊版 XML ）
* [全國法規資料庫Open API](https://law.moj.gov.tw/api/swagger/ui/index) （官方新版 API ）


## Warning
* 不會處理各「編制表」及「編組表」。
* 全國法規資料庫並沒有「所有」的法規。許多行政規則、自治條例、自治規則都不在裡面。
* 舊版法規（大多為以廢止的）會使用換行來排版。
* 2018 以前的資料會有「歷史法規」，但僅有行政命令層級的資料。法律層級的歷史演變要另外從立法院抓（本專案不處理）。
* 英譯法規的更新日期，不一定會跟中文版的一樣。


## Files

### Data
* `xml/`: 切成小份的 XML 檔，除了 `index.xml` 為彙整，其餘每個檔均是一個法規。
  * `UpdateDate.txt`: 法規更新日期
  * `index.xml`: 彙整所有法規的基本資料，包含歷次舊名。根結點保留 `UpdateDate` 屬性。
  * `FalVMingLing/`: 中文法律與命令資料檔
  * `Eng_FalVMingLing/`: 英譯法律與命令資料檔
* `json/`: 由 `xml/` 逐一轉為對應 JSON 格式的檔案，但 `index.json` 不包含 `UpdateDate` 資訊。
* `json_arrange/`: 從[官方新版 API](https://law.moj.gov.tw/api/swagger/ui/index) 下載、切分後再處理後的 JSON 。
  鍵名格式為 UpperCamelCase 的是與資料源相同的；鍵名格式為 lowerCamelCase 的則是本專案再處理過的。
* `source/`: 從全國法規資料庫下載而來的原始檔。

### Codes
* `main.js`: 主程式
* `xmlSplit.js`: 將 `source/*.xml` 切成各個小檔。可單獨執行。
* `saveSummary.js`: 將各 JSON 小檔摘要後存成 `json/index.json` 和 `xml/index.xml` 。可單獨執行。
* `xml2json.js`: 將各 XML 小檔轉存成 JSON 。可單獨執行。沒有被 `main.js` 使用。
* `arrangeAll.js`: 把 `json/` 裡頭的經過 `arrange` 後存到 `json_arrange/` 。沒有被 `main.js` 使用。
* `lib`: 函式庫
  * `arrange.js`: 改寫法規物件結構。
  * `loadSplit.js`: 讀取各 XML 或 JSON 小檔。沒有被 `main.js` 使用。
  * `getFilePath.js`: 由法規資料決定檔案路徑。
  * `mapDict.js`: 依照本程式用的物件結構，對各法規資料版本套用指定函式。
  * `parseXML.js`: 將單一法規的 XML 字串轉為 JS 物件。
  * `writeFile.js`: 將檔案寫入指定路徑。若路徑未存在就遞迴創建資料夾。


## Usage & Update
1. 安裝 Node.js 。
2. 在目錄中執行 `npm install` 。
3. 下載法規資料檔，解壓縮後存於 source 目錄。
4. 執行指令 `node main.js` ，等待數分鐘。


## Output
會創建三個子資料夾

### xml
* 輸出檔沒有 XML 宣告 `<?xml ... ?>` ，亦無 BOM ；換行字元為 `\r\n` 。
* 輸出檔縮減了 XML 的縮排，但保留了 CDATA 中換行後的縮排。
* 保留了原始檔案中，沒有資料的標籤。
* 已移除原始檔案中的控制字元（換行字元除外）。

### json
* 法規編號欄位叫做 `PCode` （不是 `pcode` ）——因為 2019 以前全國法規資料庫的變數名稱不一致。
* 移除了沒有資料的屬性，但保留空白的「編章節」。（見 H0170012 「公共藝術設置辦法」）
* 除了「法規內容」和「附件」外，各標籤均轉存為物件的字串成員。
* 「法規內容」中，為維持「編章節」和「條文」的順序，使用 [`xml2jsobj`](https://www.npmjs.com/package/xml2jsobj) 套件。
* 移除「編章節」標籤中的前置空白（ `xml2jsobj` 預設使用 `trim` ）。
* 「附件」未被官方的格式規範文件提及，已將其內的「下載網址」標籤轉存為字串陣列。

### json_arrange
* **警告**：格式未定！
* `index.json` 「不」收錄各「編制表」和「編組表」。（但各表的法規 JSON 檔仍會存在）
* 法規編號欄位叫做 `pcode` （不是 `PCode` ）——因為 2019 以後全國法規資料庫的變數名稱統一了。
* 整理過後的 JSON 檔，解析並變更「沿革內容」與「法規內容」的結構。
* 將「編章節」與「條文」分開儲存，不再混在一起。
* 章節編號與條號仿照立法院的方式，「第十五條之一」將存為 `1501` 。
* 「編章節」存為巢狀。


## 各類法規名稱數量統計 （2022-09-12）
```js
 {
  '法': 607, //< 包含憲法
  '律': 1,  //< 戰時軍律
  '條例': 600,
  '通則': 44,
  '稅則': 1, //< 海關進口稅則

  '規程': 738,
  '規則': 717,
  '細則': 1030,
  '辦法': 5052,
  '綱要': 8,
  '標準': 1036,
  '準則': 447,

  '程序': 1, //< 憲法實施之準備程序
  '條文': 1, //< 憲法增修條文
  '嚴令': 2, //< 全國戒嚴令, 臺灣地區解嚴令
  '條款': 1, //< 動員戡亂時期臨時條款
  '終止': 1, //< 宣告動員戡亂時期終止
  '命令': 1, //< 民國八十八年九月二十五日總統緊急命令
  '登記': 3  //< 藥品查驗登記審查準則─****之查驗登記
  '編制表': 396, ///< ****編制表
  '編組表': 2, //< 不當黨產處理委員會編組表, 促進轉型正義委員會編組表
  '總則編': 1, //< 建築技術規則總則編
  '施工編': 1, //< 建築技術規則建築設計施工編
  '構造編': 1, //< 建築技術規則建築構造編
  '設備編': 1, //< 建築技術規則建築設備編
}
```
