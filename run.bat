cd source
git add .
git commit -m "UpdateDate 20181221"
cd ..

del xml\UpdateDate.txt
del xml\index.xml
rmdir /s /q xml\FalVMingLing
rmdir /s /q xml\Eng_FalVMingLing
rem rmdir /s /q xml\HisMingLing

del json\UpdateDate.txt
del json\index.json
rmdir /s /q json\FalVMingLing
rmdir /s /q json\Eng_FalVMingLing
rem rmdir /s /q json\HisMingLing

node main.js

cd json
git add .
git commit -m "UpdateDate 20181221"
git tag 20181221
git push
git push --tags
cd ..

cd xml
git add .
git commit -m "UpdateDate 20181221"
git tag 20181221
git push
git push --tags
cd ..
