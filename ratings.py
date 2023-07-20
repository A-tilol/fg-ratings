"""
players.tsv
    name, team, sponsor, birthday, twitter, streaming, youtube
results.tsv 閲覧者に修正してもらえるようにする
ratings.tsv
    date, name, ratings, diff_from_last, rank, last_rank
"""

import pandas as pd

K = 32  # SFLだけだと試合数が少ないため大きめを設定

player_ratings = {
    "ボンちゃん": 1500,
    "ときど": 1500,
    "sako": 1500,
    "藤村": 1500,
    "ひぐち": 1500,
    "Shuto": 1500,
    "ガチくん": 1500,
    "かずのこ": 1500,
    "立川": 1500,
    "キチパ": 1500,
    "ストーム久保": 1500,
    "ACQUA": 1500,
    "ネモ": 1500,
    "ジョニィ": 1500,
    "ももち": 1500,
    "GO1": 1500,
    "フェンリっち": 1500,
    "ぷげら": 1500,
    "A": 1500,
    "B": 1500,
    "C": 1500,
    "D": 1500,
    "E": 1500,
}


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
    return round(K * s * (1 - expect))


results_df = pd.read_csv("./tmp/results.tsv", sep="\t", header=0)
ratings_df = pd.DataFrame(
    {}, columns=["id", "date", "name", "rating", "diff_from_last"]
)
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
        "id": i,
        "date": row.date,
        "name": row.winner,
        "rating": player_ratings[row.winner],
        "diff_from_last": diff_r,
    }
    ratings_df.loc[len(ratings_df)] = new_row

    # loser
    new_row = {
        "id": i,
        "date": row.date,
        "name": row.loser,
        "rating": player_ratings[row.loser],
        "diff_from_last": -diff_r,
    }
    ratings_df.loc[len(ratings_df)] = new_row

# 同日最後の試合後のレートを採用
ratings_df = ratings_df.sort_values(by=["id"], ascending=False).drop_duplicates(
    subset=["date", "name"], keep="first"
)

# ランク付け
ratings_df["rank"] = (
    ratings_df.groupby("date")["rating"].rank(ascending=False, method="min").astype(int)
)

ratings_df = ratings_df.sort_values(by=["date", "rating"], ascending=False)


print(ratings_df)
