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
* `index.json` 放於各語系資料夾內，以 `pcode` 為鍵名，以法規名稱為其值。

### json_arrange
* branch name: `arranged`
* **警告**：格式未定。
* 從新版 Swagger API 下載的 JSON 切開後逐一處理而成。
* 法規編號欄位是 `pcode` （不是 `PCode` ）。
* `index.json`
  * 刪除「編制表」與「編組表」類型。
  * 法規名稱截掉末尾的括號。
  * 若有同名法規，僅包含最新的。（如正副總統選罷法即有二個版本，「公立學校退休教職員一次退休金及養老給付優惠存款辦法」則有三個 `pcode` 相異的版本）
* 將「編章節」與「條文」分開儲存，不混在一起。章節編號與條號仿照立法院的方式，「第十五條之一」存為 `1501` 。
* 鍵名格式若為 UpperCamelCase 即是未更動的原始資料；若為 lowerCamelCase 則是可能被整理過的資料，列表如下：
  * name: 法規中文名稱，，轉換自 `LawName`，截掉末尾可能出現的的 `（[新舊] 100.10.10 [制訂]定）`。
  * category: 將 `LawCategory` 拆成陣列。
  * effectiveNote: 整理 `LawEffectiveNote` ，維持為字串。
  * discarded: 將 `LawAbandonNote` 的資料型態改為 boolean 。
  * attachments: 修正 `LawAttachements` 和 `EngLawAttachements` 拼錯字的問題，並將值從陣列改為物件，鍵名即附件 ID ，值為檔名。
  * histories: 將 `LawHistories` 或 `EngLawHistories` 拆解成陣列，中文版中並去掉每行開頭的「中華民國」。
  * foreword: 去除 `LawForeword` 多餘的空白。
  * articles: 條文。
  * divisions: 巢狀編章節目錄，並標示每個編章節的起迄條號。
* 轉換條文中的部分字碼（見下節），但附件檔名中的錯別字則不轉換（以避免若有下載需求而檔名不一致）。

### 字碼轉換原則
* 注音「ㄧ」(`U+3127`) 轉換為中文「一」 (`U+4E00`) 。
* 自用區（`U+E000..U+F8FF`）應是 Big-5 編碼時期造字後轉換的，逐一參考其他資料確認究竟是甚麼字或符號：
  * 若為中文字，對應至 `U+4E00..U+9FFF` （中日韓統一表意文字列表）裡。
    如 Q0010003 的 `U+EC75` ，經人工比對立法院法律系統知其應為「氹」字，故轉換為「氹」 (`U+6C39`) 。
  * 錯別字或誤植的異體字，則再換為常用字。
    J0040053 和 P0030013 的 `U+E52A` ，經比對行政院公報後得知其為異體字「奬」 (`U+596C`) ，轉換為常用字「獎」 (`U+734E`) ；
    O0020039 的 `U+ED45` ，經比對行政院公報後得知其為異體字「劵」 (`U+52B5`) ，轉換為常用字「券」 (`U+5238`) 。
  * T0020025 、 K0020027 等，在換行前有奇怪的字碼，直接移除。
  * 被圈住的數字（見於 R0030026 、L0060035、L0070019 等），均對應至襯線版本 Unicode 字碼，即 ① (`U+2460`) 與 ❶ (`U+2776`) 系列，而非 ➀ (`U+2780`) 與 ➊ (`U+278A`) 等無襯線 (sans-serif) 系列。此系列字碼不存在於原始資料中，為本專案加入。
* 直行冒號、小型頓號逗號等，因與一般冒號、頓號、逗號等易混淆，故 `U+FE30..U+FE6F` 盡量轉換為 `U+FF01..U+FF5E` （ ASCII 可見字元 的全形對應）；
  但下列情形則不轉換：
  * 直行括號。
  * ０、○、零…等，為維持與原文「看起來一樣」，故不轉換。
  * 小型方括號。因資料中的全形方括號均是用 `U+FE5D` 和 `U+FE5E` ，並無 `U+FF3B` 和 `U+FF3D` ，故不像冒號和頓號會有比對漏失的問題，是以尊重原格式。
  * 該法規特有用法（如 N0080038 有 `U+FE68` ）。
* 小數點、間格號、全形英文句號等：保留 `U+B7` ；將 `U+02D9` 及 `U+2027` 全轉換為 `U+FF0E` 。理由：
  * 參閱 [LaTeX Stack Exchange](https://tex.stackexchange.com/questions/19180/) 和 [Interpunct - Wikipedia](https://en.wikipedia.org/wiki/Interpunct#Similar_symbols) 知：
    * 小數點應使用 full stop (`U+FF0E`) ；
    * 乘法（包含內積）應使用 dot operator (`U+22C5`) ；
    * 間格號應使用 hyphenation point (`U+2027`) ；[《重訂標點符號手冊》修訂版](https://language.moe.gov.tw/001/upload/files/site_content/m0001/hau/c2.htm) （中華民國教育部，2008）是寫『「間隔號」為原「音界號」之改稱』、『整數與小數分界處也可使用間隔號』。
  * 原始資料中，點符號 `U+B7` 僅出現在英文的 O0020037 ；其餘則均為 `U+02D9` 、 `U+2027` 和 `U+FF0E` 。
  * 考量原始資料中「點」大多為小數點，少數為算式、極少數為無序列表項目符號，且原始資料中並無 `U+22C5` ，故決定保留 `U+B7` ，其餘不判斷究竟應為乘積點或小數點，一律轉為 `U+FF0E` 。


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
