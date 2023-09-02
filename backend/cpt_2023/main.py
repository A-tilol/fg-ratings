"""一括データ処理

ウェブサイトで使用するデータを集計する

集計の元データとなる試合結果はcollect_result.pyにより
あらかじめ取得しておく
"""

import os

import conf
import player_data
import ratings


def merge_tournaments_data(fname_pattern: str, out_path: str):
    # results
    results = ""
    for fname in os.listdir(conf.CPT_2023_RESULTS_DIR):
        if fname_pattern not in fname:
            continue

        result_file_path = os.path.join(conf.CPT_2023_RESULTS_DIR, fname)
        with open(result_file_path, "r", encoding="utf-8", newline="\n") as f:
            results += f.read()

    lines = results.split("\n")
    header = lines[0] + "\n"
    results = header + results.replace(header, "")

    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(results)


if __name__ == "__main__":
    merge_tournaments_data(fname_pattern="_entrants.tsv", out_path=conf.PLAYER_TSV_PATH)
    merge_tournaments_data(fname_pattern="_sets.tsv", out_path=conf.RESULTS_TSV_PATH)

    ratings_df = ratings.create_rating_data()

    player_data.create_player_data(ratings_df)
