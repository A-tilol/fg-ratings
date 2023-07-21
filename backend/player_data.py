import pandas as pd

import conf


def calc_ratings(player_df, ratings_df):
    # latest
    latest_ratings = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby("name")
        .nth(0)
        .reset_index()
    )
    player_df["name"] = latest_ratings["name"]
    player_df["last_game_date"] = latest_ratings["date"]
    player_df["latest_rating"] = latest_ratings["rating"]

    # best
    best_ratings = (
        ratings_df.sort_values(by="rating", ascending=False)
        .groupby("name")
        .nth(0)
        .reset_index()
    )
    player_df["best_rating"] = player_df.merge(
        best_ratings[["name", "rating"]], on="name", how="left"
    )["rating"]

    # worst
    worst_ratings = (
        ratings_df.sort_values(by="rating", ascending=True)
        .groupby("name")
        .nth(0)
        .reset_index()
    )
    player_df["worst_rating"] = player_df.merge(
        worst_ratings[["name", "rating"]], on="name", how="left"
    )["rating"]

    return player_df


def calc_rank(player_df, ratings_df):
    latest_ratings = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby("name")
        .nth(0)
        .reset_index()
    )
    latest_ratings["rank"] = (
        latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    second_latest_ratings = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby("name")
        .nth(1)
        .reset_index()
    )
    second_latest_ratings["rank"] = (
        second_latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    merged_df = latest_ratings.merge(second_latest_ratings, on="name", how="left")
    merged_df["diff_rank"] = merged_df["rank_y"] - merged_df["rank_x"]
    merged_df["diff_rank"] = merged_df["diff_rank"].fillna(0)

    player_df["rank"] = player_df[["name"]].merge(
        latest_ratings[["name", "rank"]], on="name", how="left"
    )["rank"]
    player_df["diff_rank"] = player_df[["name"]].merge(
        merged_df[["name", "diff_rank"]], on="name", how="left"
    )["diff_rank"]

    return player_df


def calc_win_rate(player_df):
    results_df = pd.read_csv(conf.RESULTS_TSV_PATH, sep="\t")

    win_df = results_df.groupby("winner").count().reset_index()[["winner", "stage"]]
    win_df = win_df.rename(columns={"stage": "win_n"})

    lose_df = results_df.groupby("loser").count().reset_index()[["loser", "stage"]]
    lose_df = lose_df.rename(columns={"stage": "lose_n"})

    tmp_df = win_df.merge(lose_df, left_on="winner", right_on="loser", how="outer")
    tmp_df["winner"] = tmp_df["winner"].combine_first(tmp_df["loser"])
    tmp_df = tmp_df.fillna(0)
    tmp_df["game_n"] = tmp_df["win_n"] + tmp_df["lose_n"]
    tmp_df["win_rate"] = tmp_df["win_n"] / tmp_df["game_n"]

    player_df = player_df.drop(columns=["win_rate", "game_n", "win_n", "lose_n"])
    player_df = player_df.merge(
        tmp_df[["winner", "win_rate", "game_n", "win_n", "lose_n"]],
        left_on="name",
        right_on="winner",
        how="left",
    )
    player_df = player_df.drop(columns=["winner"])

    player_df = player_df.fillna(0)

    return player_df


def create_player_data(ratings_df):
    player_df = pd.DataFrame(
        {},
        columns=[
            "name",
            "last_game_date",
            "latest_rating",
            "best_rating",
            "worst_rating",
            "rank",
            "diff_rank",
            "win_rate",
            "game_n",
            "win_n",
            "lose_n",
        ],
    )

    ratings_df.date = ratings_df.date.astype("datetime64[ns]")

    player_df = calc_ratings(player_df, ratings_df)

    player_df = calc_rank(player_df, ratings_df)

    player_df = calc_win_rate(player_df)

    player_df = player_df.sort_values(by="latest_rating", ascending=False)

    player_df.to_csv(conf.PLAYER_DATA_TSV_PATH, sep="\t", lineterminator="\n")
