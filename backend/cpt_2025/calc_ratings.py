import pandas as pd

K = 20  # レーティングの変動の大きさを決める定数。デフォルト16。大きいほど収束が早いがブレが大きい
INITIAL_RATING = 1500


def init_ratings():
    df = pd.read_csv(
        "data/cpt_2025/all_player.tsv", sep="\t", index_col=False, encoding="utf-8"
    )

    pid_to_result = {}
    for playerId, tag in zip(df["PlayerId"].tolist(), df["GamerTag"].tolist()):
        pid_to_result[playerId] = {
            "PlayerId": playerId,
            "GamerTag": tag,
            "Rating": INITIAL_RATING,
            "WinCnt": 0,
            "LoseCnt": 0,
        }
    return pid_to_result


def get_scale_factor(n: int) -> float:
    if n == 0 or n == 1:
        return 1
    if n == 2:
        return 1.5
    return (n + 11) / 8


def calc_diff_rating(winner_rating, loser_rating, diff_sets):
    """
    得失点差を考慮できるWorld Football Elo Ratingを参考
    https://en.wikipedia.org/wiki/World_Football_Elo_Ratings
    """
    s = get_scale_factor(diff_sets)
    expect = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    return round(K * s * (1 - expect))


def create_rating_data():
    print("レートを初期化")
    pid_to_results = init_ratings()
    print(f"{len(pid_to_results)=}")

    print("対戦結果データを読み込み")
    matches_df = pd.read_csv(
        "data/cpt_2025/all_matches.tsv",
        sep="\t",
        index_col=False,
        encoding="utf-8",
    )
    print(f"{len(matches_df)=}")

    # 古い試合から順に計算するため、時系列昇順に並び替え
    matches_df["_dt"] = pd.to_datetime(
        matches_df["Datetime(UTC)"], errors="coerce", utc=True
    )
    matches_df = matches_df.sort_values(by=["_dt", "Datetime(UTC)"], ascending=True)
    matches_df = matches_df.drop(columns="_dt")

    print("対戦結果データを元にレートを計算")
    rate_diffs = []
    for row in matches_df.itertuples():
        winer_id, loser_id = row.Player1, row.Player2
        if winer_id not in pid_to_results or loser_id not in pid_to_results:
            raise Exception(
                f"playerデータの無いプレイヤーIDです。{winer_id}, {loser_id}"
            )

        diff_sets = 1
        try:
            diff_sets = abs(int(row.Player1Score) - int(row.Player2Score))
        except Exception:
            pass

        diff_r = calc_diff_rating(
            pid_to_results[winer_id]["Rating"],
            pid_to_results[loser_id]["Rating"],
            diff_sets,
        )

        pid_to_results[winer_id]["Rating"] += diff_r
        pid_to_results[loser_id]["Rating"] -= diff_r

        pid_to_results[winer_id]["WinCnt"] += 1
        pid_to_results[loser_id]["LoseCnt"] += 1

        rate_diffs.append(diff_r)

    print("レートデータ作成")
    ratings_df = pd.DataFrame(pid_to_results.values())
    ratings_df = ratings_df.sort_values(by=["Rating"], ascending=False)
    ratings_df = ratings_df[
        [
            "Rating",
            # "GamerTag",
            "PlayerId",
            "WinCnt",
            "LoseCnt",
        ]
    ]
    print(f"{len(ratings_df)=}")

    print("レートデータをTSVファイルに出力")
    ratings_df.to_csv(
        "data/cpt_2025/player_ratings.tsv",
        index=False,
        sep="\t",
        lineterminator="\n",
        encoding="utf-8",
    )

    print("レート差分をmatchesに付加してTSVファイルに出力")
    matches_df["RateDiff"] = rate_diffs
    matches_df.to_csv(
        "data/cpt_2025/all_matches.tsv",
        index=False,
        sep="\t",
        lineterminator="\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    create_rating_data()
