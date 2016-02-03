#!/bin/bash
mkdir -p xml
mkdir -p json
echo removing current files ...
rm xml/UpdateDate.txt
rm xml/index.xml
rm -rf xml/FalVMingLing
rm -rf xml/Eng_FalVMingLing
rm -rf xml/HisMingLing
rm json/UpdateDate.txt
rm json/index.json
rm -rf json/FalVMingLing
rm -rf json/Eng_FalVMingLing
rm -rf json/HisMingLing
node main.js
