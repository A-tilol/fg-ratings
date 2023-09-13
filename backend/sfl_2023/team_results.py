import conf
import pandas as pd
import ratings

BATTLE2POINT = {
    1: 10,
    2: 10,
    3: 20,
    4: 5,
}

BATTLE2WINPOINT = {
    1: 1,
    2: 1,
    3: 2,
    4: 1,
}


def create_player2Team():
    player_df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t")
    player_to_team = {}
    for row in player_df.itertuples():
        player_to_team[row.name] = row.team
    return player_to_team


def update_team_date(team_date: dict, row, player2Team: dict, target: str):
    if target == "winner":
        team = player2Team[row.winner]
        opponent = player2Team[row.loser]
    else:
        team = player2Team[row.loser]
        opponent = player2Team[row.winner]
    if team not in team_date:
        team_date[team] = {}
    if row.date not in team_date[team]:
        team_date[team][row.date] = {
            "date": row.date,
            "sfl_stage": row.stage,
            "sfl_quarter": row.quarter,
            "sfl_match": row.match,
            "name": team,
            "opponent": opponent,
            "game_n": 0,
            "win_n": 0,
            "lose_n": 0,
            "points": 0,
        }

    team_date[team][row.date]["game_n"] += 1
    if target == "winner":
        team_date[team][row.date]["win_n"] += BATTLE2WINPOINT[row.battle]
        team_date[team][row.date]["points"] += BATTLE2POINT[row.battle]
    if target == "loser":
        team_date[team][row.date]["lose_n"] += BATTLE2WINPOINT[row.battle]


def init_team_ratings():
    player_df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t")
    team2rating = {}
    for row in player_df.itertuples():
        team2rating[row.team] = conf.INITIAL_RATING
    return team2rating


def calc_ratings(team_results_df):
    team2rating = init_team_ratings()

    team_results_df = team_results_df.sort_values(["date", "sfl_match"], ascending=True)

    ratings_ = []
    rate_diff = []
    for i, row in enumerate(team_results_df.itertuples()):
        if i % 2 != 0:
            continue
        win = True
        w_n, l_n = row.win_n, row.lose_n
        w_r, l_r = team2rating[row.name], team2rating[row.opponent]
        if row.win_n < row.lose_n:
            w_n, l_n = l_n, w_n
            w_r, l_r = l_r, w_r
            win = False
        r = ratings.calc_diff_rating(w_r, l_r, w_n, l_n)
        if not win:
            r = -r

        team2rating[row.name] += r
        team2rating[row.opponent] += -r
        ratings_.append(team2rating[row.name])
        ratings_.append(team2rating[row.opponent])
        rate_diff.append(r)
        rate_diff.append(-r)

    team_results_df["rating"] = ratings_
    team_results_df["rate_diff"] = rate_diff

    return team_results_df


def create_team_results_data():
    player2Team = create_player2Team()

    results_df = pd.read_csv(conf.RESULTS_TSV_PATH, sep="\t")

    team_date = {}
    for row in results_df.itertuples():
        update_team_date(team_date, row, player2Team, target="winner")
        update_team_date(team_date, row, player2Team, target="loser")

    data = [v for d in team_date.values() for v in d.values()]

    team_results_df = pd.DataFrame(
        data,
        columns=[
            "date",
            "sfl_stage",
            "sfl_quarter",
            "sfl_match",
            "name",
            "opponent",
            "game_n",
            "win_n",
            "lose_n",
            "points",
        ],
    )

    team_results_df = calc_ratings(team_results_df)

    team_results_df = team_results_df.sort_values(by=["date", "sfl_match"])
    team_results_df.to_csv(
        conf.TEAM_RESULTS_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )

    return team_results_df


if __name__ == "__main__":
    create_team_results_data()
