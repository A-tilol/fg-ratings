"""
TODO: チームレーティング, 予想勝率
"""


import player_data
import ratings

if __name__ == "__main__":
    ratings_df = ratings.create_rating_data()

    player_data.create_player_data(ratings_df)
