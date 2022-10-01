@echo off

cd json_split
git add .
git commit -m "UpdateDate 20220923"
git tag 20220923_swagger
git push
git push --tags
cd ..

cd json_arrange
git add .
git commit -m "UpdateDate 20220923"
git tag 20220923_arrange
git push
git push --tags
cd ..

pause
@echo on