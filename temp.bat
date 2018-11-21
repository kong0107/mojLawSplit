cd source
git add .
git commit -m "UpdateDate 20181102"
cd ..

node main.js

cd json
git add .
git commit -m "UpdateDate 20181102"
git tag 20181102
git push
git push --tags
cd ..

cd xml
git add .
git commit -m "UpdateDate 20181102"
git tag 20181102
git push
git push --tags
cd ..
