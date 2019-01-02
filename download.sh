#!/bin/bash
#
# Download zip files from moj and unzip them into `./source`.
# Usage: ./download.sh
#
mkdir -p source
cd source
git init

curl -L -o FalVMingLing.zip "https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM"
unzip -o FalVMingLing.zip

curl -L -o Eng_FalVMingLing.zip "https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM"
unzip -o Eng_FalVMingLing.zip

curl -L -o HisMingLing.zip "https://sendlaw.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CHM"
unzip -o HisMingLing.zip

rm *.zip
rm *.csv
git add .
git commit -m "update source"
