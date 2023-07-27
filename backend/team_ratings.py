import conf
import pandas as pd


def create_team_ratins_data(ratings_df):
    player_df = pd.DataFrame(
        {},
        columns=[
            "name",
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
            "points",
            "updated",
        ],
    )
