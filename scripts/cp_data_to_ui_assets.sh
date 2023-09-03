#!/bin/sh

set -xeu

cd $(git rev-parse --show-toplevel)

# SFL Data
mkdir -p ui/src/assets/sfl_2023/
cp data/sfl_2023/*.tsv ui/src/assets/sfl_2023/

# CPT Data
mkdir -p ui/src/assets/cpt_2023/
cp data/cpt_2023/player_data.tsv \
    ui/src/assets/cpt_2023/
