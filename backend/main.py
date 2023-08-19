import os

import conf
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
    header = lines[0] + "\n"
    results = header + results.replace(header, "")

    with open(conf.RESULTS_TSV_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(results)


if __name__ == "__main__":
    merge_results()

    ratings_df = ratings.create_rating_data()

    player_data.create_player_data(ratings_df)

    team_results_df = team_results.create_team_results_data()

    team_ratings.create_team_ratins_data(team_results_df)
