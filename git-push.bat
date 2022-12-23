@echo off

cd json_split
copy /B ../aliases.json .
git add .
git commit -m "UpdateDate 20221216"
git tag 20221216_swagger
git push
git push --tags
cd ..

cd json_arrange
copy /B ../aliases.json .
git add .
git commit -m "UpdateDate 20221216"
git tag 20221216_arrange
git push
git push --tags
cd ..

pause
@echo on