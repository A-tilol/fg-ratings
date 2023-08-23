"""試合結果をカプコン公式サイトからスクレイピング

参考：https://yon4.hatenablog.com/entry/2023/07/15/151210

このスクリプトを実行したのち、
main.pyを実行することでデータ集計を行う

start.ggのRate Limits
    80 requests per 60 seconds
    maximum of 1000 objects per request
"""

import os
import time
from pprint import pprint

import pandas as pd
import pysmashgg

startgg_token = os.environ.get("STARTGG_API_TOKEN")
smash = pysmashgg.SmashGG(startgg_token, auto_retry=True)


def aquire_battle_result(battle_elm, date, stage, section, match, battle):
    result = {
        "stage": stage,
        "quarter": section,
        "match": match,
        "date": date,
        "winner": winner["player_name"],
        "loser": loser["player_name"],
        "winner_sets": winner["total_wins"],
        "loser_sets": loser["total_wins"],
        "battle": battle,
        "chars_of_winner": ",".join(winner["charactor_names"]),
        "chars_of_loser": ",".join(loser["charactor_names"]),
    }

    return result


def acquire_entrants_data(tournament_name, date):
    """_summary_

    playerIdはプレイヤー固有のIDであるため別の大会でも同じ
    """
    print(f"Acquire entrants data of {tournament_name}")
    event_id = smash.tournament_show_event_id(tournament_name, "street-fighter-6")
    print("event id", event_id)
    entrants = smash.event_show_entrants(event_id, 1)

    entrant = entrants[0]
    entrant.update(entrant["entrantPlayers"][0])
    del entrant["entrantPlayers"]

    entrants = []
    page = 1
    while True:
        try:  # エラー対策
            time.sleep(0.8)
            ents = smash.event_show_entrants(event_id, page)
        except Exception as e:
            print(e)
            print("Retrying ...")
            continue

        if len(ents) == 0:
            break

        for ent in ents:
            ent.update(ent["entrantPlayers"][0])
            del ent["entrantPlayers"]

        entrants.extend(ents)

        if page % 10 == 0:
            print(f"page {page}, total entrants {len(entrants)}")
        page += 1

    df = pd.DataFrame(entrants)
    df.to_csv(
        f"./data/cpt_2023/{date}_{tournament_name}_entrants.tsv",
        index=False,
        sep="\t",
        lineterminator="\n",
    )


def acquire_tournament_results():
    """_summary_

    start.ggの大会構成
        複数タイトル開催の場合はtournamentの下にeventとして各タイトルが位置している
    """
    # res = smash.tournament_show("evo-2023")
    # print(res)
    event_id = smash.tournament_show_event_id("evo-2023", "street-fighter-6")
    print(event_id)
    entrants = smash.event_show_sets(event_id, 1)
    pprint(len(entrants))
    pprint(entrants[0])
    pprint(entrants[1])
    pprint(entrants[2])


if __name__ == "__main__":
    # acquire_entrants_data("evo-2023", "2023-08-04")
    # exit()

    acquire_tournament_results()
