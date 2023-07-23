#!/bin/sh

set -xeu

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "gh-pages" ]; then
    no_commited_files=$(git status --porcelain)
    if [ -n "$no_commited_files" ]; then
        echo "コミットされていない変更があります。"
        echo "$no_commited_files"
        exit 1
    fi
    git checkout gh-pages
fi

git pull origin gh-pages    
git merge main

ng build --output-path ../docs
cp ../docs/index.html ../docs/404.html

git add ..
git commit -m -
git push origin gh-pages

git checkout main
