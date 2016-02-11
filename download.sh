#!/bin/bash
#
# Download zip files from moj and unzip them into `./source`.
#
[ "$#" -eq 1 ] || (echo "Error: require specify UpdateDate" && exit 1)
mkdir -p source
cd source
git init

curl -L -o FalVMingLing.zip "http://law.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CFM"
unzip FalVMingLing.zip

curl -L -o Eng_FalVMingLing.zip "http://law.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=EFM"
unzip Eng_FalVMingLing.zip

curl -L -o HisMingLing.zip "http://law.moj.gov.tw/PublicData/GetFile.ashx?DType=XML&AuData=CHM"
unzip HisMingLing.zip

rm *.zip
git add .
git commit "UpdateDate $1"
git tag $1
