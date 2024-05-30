@echo off

cd json_split
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20240517"
git tag 20240517_swagger
git push
git push --tags
cd ..

cd json_arrange
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20240517"
git tag 20240517_arrange
git push
git push --tags
cd ..

pause
@echo on