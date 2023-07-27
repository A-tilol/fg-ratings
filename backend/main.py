"""
"""


import player_data
import ratings
import team_ratings

if __name__ == "__main__":
    ratings_df = ratings.create_rating_data()

    player_data.create_player_data(ratings_df)

    team_ratings.create_team_ratins_data()
