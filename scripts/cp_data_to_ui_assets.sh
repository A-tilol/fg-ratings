#!/bin/sh

set -xeu

mkdir -p ui/src/assets/sfl_2023/
cp data/sfl_2023/*.tsv ui/src/assets/sfl_2023/

mkdir -p ui/src/assets/cpt_2023/
cp data/cpt_2023/*.tsv ui/src/assets/cpt_2023/
