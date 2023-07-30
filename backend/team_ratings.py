import conf


def add_initial_rating(team_results_df):
    team_set = set(team_results_df.name.unique())
    for team in team_set:
        row = {
            "date": "2023-07-01",
            "sfl_stage": 0,
            "sfl_quarter": 0,
            "sfl_match": 0,
            "name": team,
            "opponent": "",
            "game_n": 0,
            "win_n": 0,
            "lose_n": 0,
            "points": 0,
            "rating": 1500,
            "rate_diff": 0,
        }
        team_results_df.loc[len(team_results_df)] = row
    return team_results_df


def calc_rank(team_results_df):
    latest_ratings = (
        team_results_df.sort_values(by="date", ascending=False)
        .groupby("name")
        .nth(0)
        .reset_index()
    )
    latest_ratings["rank"] = (
        latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    second_latest_ratings = (
        team_results_df.sort_values(by="date", ascending=False)
        .groupby("name")
        .nth(1)
        .reset_index()
    )
    second_latest_ratings["rank"] = (
        second_latest_ratings["rating"].rank(ascending=False, method="min").astype(int)
    )

    merged_df = latest_ratings.merge(second_latest_ratings, on="name", how="left")
    merged_df["diff_rank"] = merged_df["rank_y"] - merged_df["rank_x"]

    team_results_df["rank"] = (
        team_results_df[["name", "date"]]
        .merge(
            latest_ratings[["name", "date", "rank"]], on=["name", "date"], how="left"
        )["rank"]
        .tolist()
    )

    team_results_df["diff_rank"] = (
        team_results_df[["name", "date"]]
        .merge(
            merged_df[["name", "date_x", "diff_rank"]],
            left_on=["name", "date"],
            right_on=["name", "date_x"],
            how="left",
        )["diff_rank"]
        .tolist()
    )

    # points, game_n
    t = team_results_df.groupby("name").sum().reset_index()
    t = team_results_df.merge(t, on="name", how="left")
    team_results_df["points"] = t["points_y"].tolist()
    team_results_df["game_n"] = t["game_n_y"].tolist()
    team_results_df["win_n"] = t["win_n_y"].tolist()
    team_results_df["lose_n"] = t["lose_n_y"].tolist()

    team_results_df = team_results_df[
        [
            "date",
            "name",
            "rating",
            "rank",
            "diff_rank",
            "points",
            "game_n",
            "win_n",
            "lose_n",
        ]
    ]
    team_results_df = team_results_df.dropna()
    team_results_df["rank"] = team_results_df["rank"].astype(int)
    team_results_df["diff_rank"] = team_results_df["diff_rank"].astype(int)
    team_results_df = team_results_df.sort_values(
        by=["rank", "date"], ascending=[True, False]
    )

    return team_results_df


def create_team_ratins_data(team_results_df):
    team_results_df = add_initial_rating(team_results_df)

    team_results_df = calc_rank(team_results_df)

    team_results_df.to_csv(
        conf.TEAM_RATINGS_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )


if __name__ == "__main__":
    import team_results

    team_results_df = team_results.create_team_results_data()
    create_team_ratins_data(team_results_df)
