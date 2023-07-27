import conf
import pandas as pd


def create_player2Team():
    player_df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t")
    player_to_team = {}
    for row in player_df.itertuples():
        player_to_team[row.name] = row.team
    return player_to_team


def create_team_ratins_data():
    team_results_df = pd.DataFrame(
        {},
        columns=[
            "date",
            "sfl_stage",
            "sfl_quarter",
            "name",
            "game_n",
            "win_n",
            "lose_n",
            "points",
            "updated",
        ],
    )

    player2Team = create_player2Team()

    results_df = pd.read_csv(conf.RESULTS_TSV_PATH, sep="\t")

    team_date = {}
    for row in results_df.itertuples():
        team = player2Team[row.winner]
        if team not in team_date:
            pass


create_team_ratins_data()
