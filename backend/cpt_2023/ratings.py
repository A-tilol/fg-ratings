"""
"""

import conf
import pandas as pd


def init_ratings():
    # TODO: use all event entrants
    # TODO: use latest tag
    fpath = "./data/cpt_2023/2023-08-06_evo-2023_entrants.tsv"
    # tournament_name = fpath.split("/")[-1].split("_")[1]

    df = pd.read_csv(fpath, sep="\t")
    player_ratings = {
        playerId: conf.INITIAL_RATING for playerId in df["playerId"].tolist()
    }

    data = []
    for playerId, tag in zip(df["playerId"].tolist(), df["playerTag"].tolist()):
        data.append(
            {
                "date": "2023-08-01",
                "playerId": playerId,
                "playerTag": tag,
                "rating": conf.INITIAL_RATING,
                "diff_from_last": 0,
            }
        )
    ratings_df = pd.DataFrame(data)

    return player_ratings, ratings_df


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
    return round(conf.K * s * (1 - expect))


def create_rating_data():
    # TODO all events

    player_ratings, ratings_df = init_ratings()

    fpath = "./data/cpt_2023/2023-08-06_evo-2023_sets.tsv"

    # ratings_df.to_csv(conf.RATINGS_TSV_PATH, index=False, sep="\t", lineterminator="\n")

    results_df = pd.read_csv(fpath, sep="\t", lineterminator="\n")

    rating_rows = []
    for row in results_df.itertuples():
        # get player id, tag
        winer_id, loser_id = row.entrant1playerId, row.entrant2playerId
        winer_tag, loser_tag = row.entrant1playerTag, row.entrant2playerTag
        if row.winnerId == row.entrant2Id:
            winer_id, loser_id = row.entrant2playerId, row.entrant1playerId
            winer_tag, loser_tag = row.entrant2playerTag, row.entrant1playerTag

        diff_sets = abs(row.entrant1Score - row.entrant2Score)
        if row.entrant1Score == -1 or row.entrant2Score == -1:
            diff_sets = 1

        diff_r = calc_diff_rating(
            player_ratings[winer_id],
            player_ratings[loser_id],
            diff_sets,
        )

        player_ratings[winer_id] += diff_r
        player_ratings[loser_id] -= diff_r

        # winner
        new_row = {
            "date": row.date,
            "tournament": row.tournament,
            "battle_order": row.battle_order,
            "playerId": winer_id,
            "playerTag": winer_tag,
            "rating": player_ratings[winer_id],
            "diff_from_last": diff_r,
        }
        rating_rows.append(new_row)

        # loser
        new_row = {
            "date": row.date,
            "tournament": row.tournament,
            "battle_order": row.battle_order,
            "playerId": loser_id,
            "playerTag": loser_tag,
            "rating": player_ratings[loser_id],
            "diff_from_last": -diff_r,
        }
        rating_rows.append(new_row)

    r_df = pd.DataFrame(rating_rows)
    ratings_df = pd.concat([ratings_df, r_df], ignore_index=True)

    def latest(values):
        return values.iloc[0]

    ratings_sumed_by_date_df = (
        ratings_df.sort_values(by=["date", "battle_order"], ascending=False)
        .groupby(by=["date", "playerId"])
        .agg(
            {
                "tournament": latest,
                "playerTag": latest,
                "rating": latest,
                "diff_from_last": "sum",
            }
        )
        .reset_index()
    )

    ratings_df = ratings_df.sort_values(
        by=["date", "battle_order", "rating"], ascending=False
    )
    ratings_sumed_by_date_df = ratings_sumed_by_date_df.sort_values(
        by=["date", "rating"], ascending=False
    )

    ratings_df = ratings_df[
        [
            "date",
            "tournament",
            "playerId",
            "playerTag",
            "rating",
            "diff_from_last",
        ]
    ]
    ratings_sumed_by_date_df = ratings_sumed_by_date_df[
        [
            "date",
            "tournament",
            "playerId",
            "playerTag",
            "rating",
            "diff_from_last",
        ]
    ]

    ratings_df.to_csv(
        conf.RATINGS_ALL_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )
    ratings_sumed_by_date_df.to_csv(
        conf.RATINGS_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )

    return ratings_sumed_by_date_df


if __name__ == "__main__":
    create_rating_data()
