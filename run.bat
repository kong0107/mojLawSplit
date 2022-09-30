@echo off

echo Delete old data

del xml\UpdateDate.txt
del xml\index.xml
rmdir /s /q xml\FalVMingLing
rmdir /s /q xml\Eng_FalVMingLing

del json\UpdateDate.txt
del json\index.json
rmdir /s /q json\FalVMingLing
rmdir /s /q json\Eng_FalVMingLing

@REM del json_arrange\UpdateDate.txt
@REM del json_arrange\index.json
@REM rmdir /s /q json_arrange\ch
@REM rmdir /s /q json_arrange\en

echo Execute main
node main.js

echo Upload split XML
cd xml
git add .
git commit -m "UpdateDate 20220916"
git tag 20220916
git push
git push --tags
cd ..

echo Upload converted JSON
cd json
git add .
git commit -m "UpdateDate 20220916"
git tag 20220916
git push
git push --tags
cd ..

@REM echo Upload arranged JSON
@REM cd json_arrange
@REM git add .
@REM git commit -m "UpdateDate 20220916"
@REM git tag 20220916_arrange
@REM git push
@REM git push --tags
@REM cd ..

echo Done!
pause
echo on