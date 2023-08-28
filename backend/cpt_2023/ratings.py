"""
"""

import conf
import pandas as pd


def init_ratings():
    # TODO: use all event entrants
    # TODO: use latest tag
    fpath = "./data/cpt_2023/2023-08-04_evo-2023_entrants.tsv"
    tournament_name = fpath.split("/")[-1].split("_")[1]

    df = pd.read_csv(fpath, sep="\t")
    player_ratings = {
        playerId: conf.INITIAL_RATING for playerId in df["playerId"].tolist()
    }

    data = []
    for playerId, tag in zip(df["playerId"].tolist(), df["tag"].tolist()):
        data.append(
            {
                "date": "2023-07-01",
                "tournament_name": tournament_name,
                "playerId": playerId,
                "entrantTag": tag,
                "rating": conf.INITIAL_RATING,
                "diff_from_last": 0,
            }
        )
    ratings_df = pd.DataFrame(
        data,
        columns=[
            "date",
            "tournament_name",
            "playerId",
            "entrantTag",
            "rating",
            "diff_from_last",
        ],
    )

    return player_ratings, ratings_df


def get_scale_factor(n: int) -> float:
    if n == 0 or n == 1:
        return 1
    if n == 2:
        return 1.5
    return (n + 11) / 8


def calc_diff_rating(winner_rating, loser_rating, winner_sets, loser_sets):
    """
    得失点差を考慮できるWorld Football Elo Ratingを参考
    https://en.wikipedia.org/wiki/World_Football_Elo_Ratings
    """
    s = get_scale_factor(abs(winner_sets - loser_sets))
    expect = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    return round(conf.K * s * (1 - expect))


def create_rating_data():
    # TODO all events

    player_ratings, ratings_df = init_ratings()

    fpath = "./data/cpt_2023/2023-08-04_evo-2023_sets.tsv"

    # ratings_df.to_csv(conf.RATINGS_TSV_PATH, index=False, sep="\t", lineterminator="\n")

    results_df = pd.read_csv(fpath, sep="\t", lineterminator="\n")

    for i, row in enumerate(results_df.itertuples()):
        diff_r = calc_diff_rating(
            player_ratings[row.winner],
            player_ratings[row.loser],
            row.winner_sets,
            row.loser_sets,
        )

        player_ratings[row.winner] += diff_r
        player_ratings[row.loser] -= diff_r

        # winner
        new_row = {
            "date": row.date,
            "battle": row.battle,
            "name": row.winner,
            "rating": player_ratings[row.winner],
            "diff_from_last": diff_r,
        }
        ratings_df.loc[len(ratings_df)] = new_row

        # loser
        new_row = {
            "date": row.date,
            "battle": row.battle,
            "name": row.loser,
            "rating": player_ratings[row.loser],
            "diff_from_last": -diff_r,
        }
        ratings_df.loc[len(ratings_df)] = new_row

    def max_battle(values):
        return values.iloc[0]

    ratings_df = (
        ratings_df.sort_values(by="battle", ascending=False)
        .groupby(by=["date", "name"])
        .agg(
            {
                "rating": max_battle,
                "diff_from_last": "sum",
            }
        )
        .reset_index()
    )

    ratings_df = ratings_df.sort_values(by=["date", "rating"], ascending=False)
    ratings_df.to_csv(conf.RATINGS_TSV_PATH, index=False, sep="\t", lineterminator="\n")

    return ratings_df


if __name__ == "__main__":
    create_rating_data()
