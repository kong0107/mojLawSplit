@echo off

cd json_split
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20221230"
git tag 20221230_swagger
git push
git push --tags
cd ..

cd json_arrange
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20221230"
git tag 20221230_arrange
git push
git push --tags
cd ..

pause
@echo on