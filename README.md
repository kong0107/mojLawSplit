# mojLawSplit
將全國法規資料庫的 XML 和 JSON 切為許多小檔，存為 XML 與 JSON 。

本專案僅保留程式碼，實際資料檔請連向：
* [mojLawSplitXML](https://github.com/kong0107/mojLawSplitXML) （從舊版 XML 切出來）
* [mojLawSplitJSON 舊版](https://github.com/kong0107/mojLawSplitJSON) （從舊版 XML 切出來後轉換為 JSON）
* [mojLawSplitJSON 純切版](https://github.com/kong0107/mojLawSplitJSON/tree/arranged) （從新版 JSON 切出來）
* [mojLawSplitJSON 重整版](https://github.com/kong0107/mojLawSplitJSON/tree/arranged) （從新版 JSON 切出來後轉換）


## 資料來源
* [政府資料開放平台](https://data.gov.tw/datasets/search?query=%E6%B3%95%E8%A6%8F) （官方舊版 XML ）
* [全國法規資料庫Open API](https://law.moj.gov.tw/api/swagger/ui/index) （官方新版 API ）

### 新版 (swagger)
* 有 XML 也有 JSON ，但仍然是一個 ZIP 檔裡面把所有法律／命令放在一個檔案裡。
* 鍵名把 attachment 拼錯了。


## Warning
* 全國法規資料庫並沒有「所有」的法規。許多行政規則、自治條例、自治規則都不在裡面。
* 舊版法規（大多為以廢止的）會使用換行來排版。
* 2018 以前有「歷史法規」，但亦僅有行政命令層級的資料。法律層級的歷史演變要另外從立法院抓。（本專案均不處理）
* 英譯法規的更新日期，不一定會跟中文版的一樣。


## Files
* `main.js`: 主程式
* `lib`: 函式庫
  * `arrange.js`: 改寫法規物件結構。
  * `parseXML.js`: 將單一法規的 XML 字串轉為 JS 物件。


## Usage & Update
1. 安裝 Node.js 。
2. 在目錄中執行 `npm install` 。
3. 下載法規資料檔，解壓縮後存於 source 目錄。
4. 執行指令 `node main.js` ，等待數分鐘。


## Output
會創建四個子資料夾

### xml
* 輸出檔沒有 XML 宣告 `<?xml ... ?>` ，亦無 BOM ；換行字元為 `\r\n` 。
* 輸出檔縮減了 XML 的縮排，但保留了 CDATA 中換行後的縮排。
* 保留了原始檔案中，沒有資料的標籤。
* 已移除原始檔案中的控制字元（換行字元除外）。

### json
* branch name: `gh-pages`
* 從舊版 XML 檔切開後轉換而成。
* 法規編號欄位是 `PCode` （不是 `pcode` ）。
* 移除了沒有資料的屬性，但保留空白的「編章節」。（見 H0170012 「公共藝術設置辦法」）
* 除了「法規內容」和「附件」外，各標籤均轉存為物件的字串成員。
* 「法規內容」中，為維持「編章節」和「條文」的順序，使用 [`xml2jsobj`](https://www.npmjs.com/package/xml2jsobj) 套件。
* 移除「編章節」標籤中的前置空白（ `xml2jsobj` 預設使用 `trim` ）。
* 「附件」未被官方的格式規範文件提及，已將其內的「下載網址」標籤轉存為字串陣列。

### json_split
* branch name: `split`
* 從新版 Swagger API 下載的 JSON 切開而成，無 BOM 。
* 資料夾僅區分語言，不區分法律與命令。
* `index.json` 放於各語系資料夾內。

### json_arrange
* branch name: `arranged`
* **警告**：格式未定，詳參 `lib/arrange.js` 。
* 從新版 Swagger API 下載的 JSON 切開後逐一處理而成。
* `index.json` 放於各語系資料夾內，且 「不」收錄各「編制表」和「編組表」。（但各表的法規 JSON 檔仍會存在）
* 法規編號欄位是 `pcode` （不是 `PCode` ）。
* 將「編章節」與「條文」分開儲存，不混在一起。
  * 章節編號與條號仿照立法院的方式，「第十五條之一」存為 `1501` 。
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
