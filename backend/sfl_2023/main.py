"""一括データ処理

ウェブサイトで使用するデータを集計する

集計の元データとなる試合結果はcollect_result.pyにより
あらかじめ取得しておく
"""

import os

import conf
import pandas as pd
import player_data
import ratings
import team_ratings
import team_results


def merge_results():
    results = ""
    for fname in os.listdir(conf.SFL_2023_RESULTS_DIR):
        result_file_path = os.path.join(conf.SFL_2023_RESULTS_DIR, fname)

        with open(result_file_path, "r", encoding="utf-8", newline="\n") as f:
            results += f.read()

    lines = results.split("\n")
    header_line = lines[0] + "\n"
    header = lines[0].split("\t")
    data = results.replace(header_line, "")
    data = [row.split("\t") for row in data.split("\n") if bool(row)]

    df = pd.DataFrame(data, columns=header)
    df["stage"] = df["stage"].astype(int)
    df["quarter"] = df["quarter"].astype(int)
    df["match"] = df["match"].astype(int)
    df = df.sort_values(by=["stage", "quarter", "match"])

    df.to_csv(conf.RESULTS_TSV_PATH, index=False, sep="\t", lineterminator="\n")


if __name__ == "__main__":
    merge_results()

    ratings_df = ratings.create_rating_data()

    player_data.create_player_data(ratings_df)

    team_results_df = team_results.create_team_results_data()

    team_ratings.create_team_ratins_data(team_results_df)
