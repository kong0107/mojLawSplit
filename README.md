# mojLawSplit
將全國法規資料庫的 XML 檔切為許多小檔

## Files
* `UpdateDate.txt`: 法規更新日期
* `FalV/`: 中文法律資料檔
* `MingLing/`: 中文命令資料檔
* `Eng_FalV/`: 英譯法律資料檔
* `Eng_MingLing/`: 英譯命令資料檔
* `HisMingLing/`: 歷史命令資料檔，依各法規的 `PCODE` 再分成各子資料夾。

## Update
1. 安裝 Node.js
2. 從[全國法規資料庫](http://law.moj.gov.tw/PublicData/DevelopGuide.aspx)下載法規資料檔，解壓縮成各 XML 檔後，存於 source 目錄。
3. 執行指令 `node main.js`

## Concerns
* 輸出檔沒有 XML 宣告（`<?xml ... ?>`），亦無 BOM 。
* 輸出檔縮減了 XML 的縮排，但保留了 CDATA 中換行後的縮排。
* 並未移除原始檔案中的多餘字元（原始檔中除了 BOM 外，另有一些奇怪的控制字元）
