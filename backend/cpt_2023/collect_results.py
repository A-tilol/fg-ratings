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
from pysmashgg import filters
from pysmashgg.api import run_query

startgg_token = os.environ.get("STARTGG_API_TOKEN")
smash = pysmashgg.SmashGG(startgg_token, auto_retry=True)


ROUND_ORDER = {
    "Winners Round 1": 1,
    "Winners Round 2": 2,
    "Winners Quarter-Final": 3,
    "Winners Semi-Final": 4,
    "Winners Final": 5,
    "Losers Round 1": 6,
    "Losers Round 2": 7,
    "Losers Round 3": 8,
    "Losers Round 4": 9,
    "Losers Round 5": 10,
    "Losers Quarter-Final": 11,
    "Losers Semi-Final": 12,
    "Losers Final": 13,
    "Grand Final": 14,
    "Grand Final Reset": 15,
}

BRAKET_ORDER = {
    "Round 1 Pools": 1,
    "Round 2 Pools": 2,
    "Round 3 Pools": 3,
    "Top 96 Pools": 4,
    "Top 24": 5,
    "Top 6": 6,
}

# def aquire_battle_result(battle_elm, date, stage, section, match, battle):
#     result = {
#         "stage": stage,
#         "quarter": section,
#         "match": match,
#         "date": date,
#         "winner": winner["player_name"],
#         "loser": loser["player_name"],
#         "winner_sets": winner["total_wins"],
#         "loser_sets": loser["total_wins"],
#         "battle": battle,
#         "chars_of_winner": ",".join(winner["charactor_names"]),
#         "chars_of_loser": ",".join(loser["charactor_names"]),
#     }

#     return result


def acquire_entrants_data(tournament_name, date):
    """_summary_

    playerIdはプレイヤー固有のIDであるため別の大会でも同じ
    """
    print(f"Acquire entrants data of {tournament_name}")
    event_id = smash.tournament_show_event_id(tournament_name, "street-fighter-6")
    print("event id", event_id)

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


def show_num_of_eventsets(event_id):
    SHOW_SETS_TOTAL_QUERY = """query EventSets($eventId: ID!) {
        event(id: $eventId) {
            tournament {
            id
            name
            }
            name
            sets(page: 1, perPage: 5, sortType: CALL_ORDER) {
                pageInfo {
                    total
                }
            }
        }
    }"""

    res = run_query(
        SHOW_SETS_TOTAL_QUERY,
        variables={"eventId": event_id},
        header={"Authorization": "Bearer " + startgg_token},
        auto_retry=True,
    )
    return res["data"]["event"]["sets"]["pageInfo"]["total"]


def show_sets_by_player():
    SHOW_SETS_TOTAL_QUERY = """query Sets {
    player(id: 138015) {
        id
        sets(perPage: 3, page: 1) {
        nodes {
            id
            displayScore
            event {
            id
            name
            tournament {
                id
                name
            }
            }
        }
        }
    }
    }"""

    res = run_query(
        SHOW_SETS_TOTAL_QUERY,
        variables={},
        header={"Authorization": "Bearer " + startgg_token},
        auto_retry=True,
    )
    pprint(res)


def acquire_tournament_results(tournament_name, date, sort_type):
    """_summary_

    start.ggの大会構成
        複数タイトル開催の場合はtournamentの下にeventとして各タイトルが位置している
    """
    per_page = 30
    print(f"acquire tournament results in the order {sort_type}")

    out_path = f"./data/cpt_2023/{date}_{tournament_name}_sets.tsv"

    # 既存データロード
    sets_df = pd.DataFrame()
    if os.path.exists(out_path):
        sets_df = pd.read_csv(out_path, sep="\t", lineterminator="\n")
        # sets_df = sets_df.drop(
        #     columns=["entrant1Chars", "entrant2Chars", "gameWinners"]
        # )

    def save_sets(sets_df, event_sets):
        """既存データにマージして保存"""
        df = pd.DataFrame(event_sets)
        sets_df = pd.concat([sets_df, df])
        sets_df = sets_df.drop_duplicates("id")
        sets_df = sets_df.sort_values(by=["bracketOrder", "bracketId", "roundOrder"])
        sets_df.to_csv(
            out_path,
            index=False,
            sep="\t",
            lineterminator="\n",
        )
        return sets_df

    def query_event_sets(event_id, page, perPage, sortType):
        SHOW_SETS_TOTAL_QUERY = """query EventSets($eventId: ID!, $page: Int!, $perPage: Int!, $sortType: SetSortType!) {
  event(id: $eventId) {
    tournament {
      id
      name
    }
    name
    sets(page: $page, perPage: $perPage, sortType: $sortType) {
      nodes {
        fullRoundText
        games {
          winnerId
          selections {
            selectionValue
            entrant {
              id
            }
          }
        }
        id
        slots {
          standing {
            id
            placement
            stats {
              score {
                value
              }
            }
          }
          entrant {
            id
            name
            participants {
              entrants {
                id
              }
              player {
                id
                gamerTag
                
              }
            }
          }
        }
        phaseGroup {
          id
          phase {
            name
          }
        }
      }
    }
  }
}"""

        res = run_query(
            SHOW_SETS_TOTAL_QUERY,
            variables={
                "eventId": event_id,
                "page": page,
                "perPage": perPage,
                "sortType": sortType,
            },
            header={"Authorization": "Bearer " + startgg_token},
            auto_retry=True,
        )
        # pprint(res)
        return filters.show_sets_filter(res)

    print(f"Acquire entrants data of {tournament_name}")
    event_id = smash.tournament_show_event_id(tournament_name, "street-fighter-6")
    print("event id", event_id)

    total_sets = show_num_of_eventsets(event_id)
    print("total sets", total_sets)

    event_sets = []
    page = 1
    retry = 0
    while retry < 3:
        try:  # エラー対策
            time.sleep(0.1)
            # esets = smash.event_show_sets(event_id, page)
            esets = query_event_sets(event_id, page, per_page, sort_type)
        except Exception as e:
            retry += 1
            print(e)
            print("Retrying ...")
            continue
        retry = 0

        if len(esets) == 0:
            break

        # 整形
        for eset in esets:
            entrant1_info = {
                f"entrant1{k}": v for k, v in eset["entrant1Players"][0].items()
            }
            entrant2_info = {
                f"entrant2{k}": v for k, v in eset["entrant2Players"][0].items()
            }
            eset.update(entrant1_info)
            eset.update(entrant2_info)
            del eset["entrant1Players"]
            del eset["entrant2Players"]

            for key in ["entrant1Chars", "entrant2Chars", "gameWinners"]:
                if key in eset:
                    del eset[key]

            eset["bracketOrder"] = BRAKET_ORDER[eset["bracketName"]]
            eset["roundOrder"] = ROUND_ORDER[eset["fullRoundText"]]

        event_sets.extend(esets)

        if page % 5 == 0:
            print(f"page {page}, {page*per_page}/{total_sets}")
            sets_df = save_sets(sets_df, event_sets)
            event_sets = []
        page += 1

    sets_df = save_sets(sets_df, event_sets)


if __name__ == "__main__":
    # acquire_entrants_data("evo-2023", "2023-08-04")
    # exit()

    # 試合結果取得。10000試合までしか取得できないのでsort順を変えて取得
    acquire_tournament_results("evo-2023", "2023-08-04", "CALL_ORDER")
    acquire_tournament_results("evo-2023", "2023-08-04", "RECENT")
