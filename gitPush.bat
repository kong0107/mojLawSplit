@echo off

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