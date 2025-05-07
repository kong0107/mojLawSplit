@echo off

cd xml
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250425"
git tag 20250425
git push
git push --tags
cd ..

cd json
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250425"
git tag 20250425
git push
git push --tags
cd ..

cd json_split
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250425"
git tag 20250425_swagger
git push
git push --tags
cd ..

cd json_arrange
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250425"
git tag 20250425_arrange
git push
git push --tags
cd ..

pause
@echo on