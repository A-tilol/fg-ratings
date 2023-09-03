#!TODO all results

import conf
import numpy as np
import pandas as pd


def calc_ratings(player_df, ratings_df):
    # latest
    latest_ratings = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby("playerId")
        .nth(0)
        .reset_index()
    )
    player_df["playerId"] = latest_ratings["playerId"]
    player_df["last_game_date"] = latest_ratings["date"]
    player_df["latest_rating"] = latest_ratings["rating"]

    # best
    best_ratings = (
        ratings_df.sort_values(by="rating", ascending=False)
        .groupby("playerId")
        .nth(0)
        .reset_index()
    )
    player_df["best_rating"] = player_df.merge(
        best_ratings[["playerId", "rating"]], on="playerId", how="left"
    )["rating"]

    # worst
    worst_ratings = (
        ratings_df.sort_values(by="rating", ascending=True)
        .groupby("playerId")
        .nth(0)
        .reset_index()
    )
    player_df["worst_rating"] = player_df.merge(
        worst_ratings[["playerId", "rating"]], on="playerId", how="left"
    )["rating"]

    # diff
    tmp_df = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby(by="playerId")
        .nth(0)
        .reset_index()
    )
    player_df["diff_rating"] = player_df[["playerId"]].merge(
        tmp_df[["playerId", "diff_from_last"]], on="playerId", how="left"
    )["diff_from_last"]
    player_df.loc[
        player_df["last_game_date"] != max(player_df["last_game_date"]), "diff_rating"
    ] = 0

    return player_df


def calc_rank(player_df, ratings_df):
    latest_ratings = (
        ratings_df.sort_values(by="date", ascending=False)
        .groupby("playerId")
        .nth(0)
        .reset_index()
    )
    latest_ratings["rank"] = (
        latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    latest_date = ratings_df["date"].max()
    second_latest_ratings = (
        ratings_df[ratings_df["date"] != latest_date]
        .sort_values(by="date", ascending=False)
        .groupby("playerId")
        .nth(0)
        .reset_index()
    )
    second_latest_ratings["rank"] = (
        second_latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    merged_df = latest_ratings.merge(second_latest_ratings, on="playerId", how="left")
    merged_df["diff_rank"] = merged_df["rank_y"] - merged_df["rank_x"]
    merged_df["diff_rank"] = merged_df["diff_rank"].fillna(0)

    player_df["rank"] = player_df[["playerId"]].merge(
        latest_ratings[["playerId", "rank"]], on="playerId", how="left"
    )["rank"]
    player_df["diff_rank"] = player_df[["playerId"]].merge(
        merged_df[["playerId", "diff_rank"]], on="playerId", how="left"
    )["diff_rank"]

    player_df.loc[player_df["diff_rating"] == 0, "diff_rank"] = 0

    return player_df


def calc_win_rate(player_df):
    results_df = pd.read_csv(conf.RESULTS_TSV_PATH, sep="\t")

    # entrantId to playerId
    results = results_df.to_dict("records")
    for row in results:
        if row["entrant1Id"] == row["winnerId"]:
            row["winnerId"] = row["entrant1playerId"]
            row["loserId"] = row["entrant2playerId"]
        else:
            row["loserId"] = row["entrant1playerId"]
            row["winnerId"] = row["entrant2playerId"]
    results_df = pd.DataFrame.from_dict(results)

    win_df = results_df.groupby("winnerId").count().reset_index()[["winnerId", "id"]]
    win_df = win_df.rename(columns={"id": "win_n"})

    lose_df = results_df.groupby("loserId").count().reset_index()[["loserId", "id"]]
    lose_df = lose_df.rename(columns={"id": "lose_n"})

    tmp_df = win_df.merge(lose_df, left_on="winnerId", right_on="loserId", how="outer")
    tmp_df["winnerId"] = tmp_df["winnerId"].combine_first(tmp_df["loserId"])
    tmp_df = tmp_df.fillna(0)
    tmp_df["game_n"] = tmp_df["win_n"] + tmp_df["lose_n"]
    tmp_df["win_rate"] = tmp_df["win_n"] / tmp_df["game_n"]

    player_df = player_df.drop(columns=["win_rate", "game_n", "win_n", "lose_n"])
    player_df = player_df.merge(
        tmp_df[["winnerId", "win_rate", "game_n", "win_n", "lose_n"]],
        left_on="playerId",
        right_on="winnerId",
        how="left",
    )
    player_df = player_df.drop(columns=["winnerId"])

    player_df = player_df.fillna(0)

    return player_df


def set_update(player_df):
    player_df.loc[
        player_df["last_game_date"] == max(player_df["last_game_date"]), "updated"
    ] = True
    player_df["updated"].fillna("", inplace=True)

    return player_df


def add_player_tag_column(player_data_df):
    player_df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t")

    # unique playerId, and use laest tag
    player_df["order"] = np.arange(len(player_df))
    player_df = player_df.loc[player_df.groupby("playerId")["order"].idxmax()]

    players = player_df.to_dict("records")
    playerId2Tag = {}
    for row in players:
        playerId2Tag[row["playerId"]] = row["playerTag"]

    player_data_df["playerTag"] = [
        playerId2Tag[_id] for _id in player_data_df["playerId"].tolist()
    ]

    return player_data_df


def add_player_country_column(player_data_df):
    player_info_df = pd.read_csv(conf.PLAYER_INFO_TSV_PATH, sep="\t")
    id2country = {
        row["playerId"]: row["countryCode"] for row in player_info_df.to_dict("records")
    }

    player_data_df["country"] = [
        id2country[player_id] for player_id in player_data_df["playerId"].tolist()
    ]

    return player_data_df


def create_player_data(ratings_df):
    player_df = pd.DataFrame(
        {},
        columns=[
            "playerId",
            "playerTag",
            "country",
            "last_game_date",
            "latest_rating",
            "best_rating",
            "worst_rating",
            "diff_rating",
            "rank",
            "diff_rank",
            "win_rate",
            "game_n",
            "win_n",
            "lose_n",
            "updated",
        ],
    )

    ratings_df.date = ratings_df.date.astype("datetime64[ns]")

    player_df = calc_ratings(player_df, ratings_df)

    player_df = calc_rank(player_df, ratings_df)

    player_df = calc_win_rate(player_df)

    player_df = add_player_tag_column(player_df)

    player_df = add_player_country_column(player_df)

    player_df = set_update(player_df)

    player_df = player_df.sort_values(by="latest_rating", ascending=False)

    player_df.to_csv(
        conf.PLAYER_DATA_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )
