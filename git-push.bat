@echo off

cd xml
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250926"
git tag 20250926
git push
git push --tags
cd ..

cd json
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20250926"
git tag 20250926
git push
git push --tags
cd ..

cd json_split
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20251003"
git tag 20251003_swagger
git push
git push --tags
cd ..

cd json_arrange
copy /B /Y ..\aliases.json .\aliases.json
git add .
git commit -m "UpdateDate 20251003"
git tag 20251003_arrange
git push
git push --tags
cd ..

pause
@echo on