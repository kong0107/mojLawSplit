@echo off

echo Check source
cd source
git add .
git commit -m "UpdateDate 20220722"
cd ..

echo Delete old data

del xml\UpdateDate.txt
del xml\index.xml
rmdir /s /q xml\FalVMingLing
rmdir /s /q xml\Eng_FalVMingLing

del json\UpdateDate.txt
del json\index.json
rmdir /s /q json\FalVMingLing
rmdir /s /q json\Eng_FalVMingLing

del json_arrange\UpdateDate.txt
del json_arrange\index.json
rmdir /s /q json_arrange\FalVMingLing
rmdir /s /q json_arrange\Eng_FalVMingLing

echo Execute main
node main.js

echo Upload split XML
cd xml
git add .
git commit -m "UpdateDate 20220722"
git tag 20220722
git push
git push --tags
cd ..

echo Upload converted JSON
cd json
git add .
git commit -m "UpdateDate 20220722"
git tag 20220722
git push
git push --tags
cd ..

echo Upload arranged JSON
cd json_arrange
git add .
git commit -m "UpdateDate 20220722"
git tag 20220722_arrange
git push
git push --tags
cd ..

echo Done!
pause
echo on