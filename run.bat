cd source
git add .
git commit -m "UpdateDate 20181214"
cd ..

del xml\UpdateDate.txt
del xml\index.xml
rmdir /s /q xml\FalVMingLing
rmdir /s /q xml\Eng_FalVMingLing
rmdir /s /q xml\HisMingLing

del json\UpdateDate.txt
del json\index.json
rmdir /s /q json\FalVMingLing
rmdir /s /q json\Eng_FalVMingLing
rmdir /s /q json\HisMingLing

node main.js

cd json
git add .
git commit -m "UpdateDate 20181214"
git tag 20181214
git push
git push --tags
cd ..

cd xml
git add .
git commit -m "UpdateDate 20181214"
git tag 20181214
git push
git push --tags
cd ..
