#!/bin/sh

set -xeu

current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "gh-pages" ]; then
  echo "現在のブランチは gh-pages ではありません。buildはgh-pagesで行ってください"
  exit 1
fi

ng build --output-path ../docs

cp ../docs/index.html ../docs/404.html

git add ..
