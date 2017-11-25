#!/bin/bash
#
# Use this only if your `source/`, `xml/`, `json/` are all git repositories.
# Usage:
# 1. Maintain your `source/` as a repository with tags
# 2. Run `./update.sh <tag>` where <tag> is a tag of `source/` repository.
#
[ "$#" -eq 1 ] || (echo "Error: require one argument" && exit 1)
echo checking out the source to $1
cd source
git checkout $1
if [[ $? -ne 0 ]] ; then
	exit 1
fi
cd ..
./start.sh

echo committing and pushing XML repository
cd xml
git add .
git commit -m "UpdateDate $1"
git tag $1
git push
git push --tags
cd ..

echo Committing and pushing JSON repository
cd json
git add .
git commit -m "UpdateDate $1"
git tag $1
git push
git push --tags
cd ..

echo Checking out the source to the newest commit
cd source
git checkout master
cd ..
