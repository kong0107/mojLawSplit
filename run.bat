echo Check source
cd source
git add .
git commit -m "UpdateDate 20190104"
cd ..


echo Delete old data

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

del json_arrange\UpdateDate.txt
del json_arrange\index.json
rmdir /s /q json_arrange\FalVMingLing
rmdir /s /q json_arrange\Eng_FalVMingLing
rmdir /s /q json_arrange\HisMingLing

echo Execute main
node main.js

echo Upload split XML
cd xml
git add .
git commit -m "UpdateDate 20190104"
git tag 20190104
git push
git push --tags
cd ..

echo Upload converted JSON
cd json
git add .
git commit -m "UpdateDate 20190104"
git tag 20190104
git push
git push --tags
cd ..

echo Upload arranged JSON
cd json_arrange
git add .
git commit -m "UpdateDate 20190104"
git tag 20190104_arrange
git push
git push --tags
cd ..

echo Done!
