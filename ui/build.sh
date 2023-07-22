#!/bin/sh

set -xeu

ng build --output-path ../docs

cp ../docs/index.html ../docs/404.html
