@echo off

cd xml
git add .
git commit -m "UpdateDate 20221021"
git tag 20221021
git push
git push --tags
cd ..

cd json
git add .
git commit -m "UpdateDate 20221021"
git tag 20221021
git push
git push --tags
cd ..

pause
@echo on