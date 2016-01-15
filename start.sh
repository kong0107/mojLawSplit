#!/bin/bash
mkdir -p xml
mkdir -p json
echo removing current files ...
rm xml/UpdateDate.txt
rm -rf xml/FalV
rm -rf xml/Eng_FalV
rm -rf xml/MingLing
rm -rf xml/Eng_MingLing
rm -rf xml/HisMingLing
rm json/UpdateDate.txt
rm -rf json/FalV
rm -rf json/Eng_FalV
rm -rf json/MingLing
rm -rf json/Eng_MingLing
rm -rf json/HisMingLing
node main.js
