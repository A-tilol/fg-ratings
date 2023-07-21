"""
"""

import pandas as pd

import conf


def init_ratings():
    df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t")
    player_ratings = {name: conf.INITIAL_RATING for name in df.name.tolist()}

    data = []
    for name in df.name.tolist():
        data.append(
            {
                "id": 0,
                "date": "2023-07-01",
                "name": name,
                "rating": conf.INITIAL_RATING,
                "diff_from_last": 0,
            }
        )
    ratings_df = pd.DataFrame(
        data, columns=["id", "date", "name", "rating", "diff_from_last"]
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
    player_ratings, ratings_df = init_ratings()

    results_df = pd.read_csv(conf.RESULTS_TSV_PATH, sep="\t")
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
            "id": i + 1,
            "date": row.date,
            "name": row.winner,
            "rating": player_ratings[row.winner],
            "diff_from_last": diff_r,
        }
        ratings_df.loc[len(ratings_df)] = new_row

        # loser
        new_row = {
            "id": i + 1,
            "date": row.date,
            "name": row.loser,
            "rating": player_ratings[row.loser],
            "diff_from_last": -diff_r,
        }
        ratings_df.loc[len(ratings_df)] = new_row

    ratings_df = ratings_df.sort_values(by=["date", "rating"], ascending=False)
    ratings_df.to_csv(conf.RATINGS_TSV_PATH, sep="\t", line_terminator="\n")

    return ratings_df
