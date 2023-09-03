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

import conf
import numpy as np
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


def acquire_entrants_data(tournament_name, date):
    """トーナメントの参加者の情報を取得

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
        sets_df["battle_order"] = np.arange(len(sets_df))
        sets_df["tournament"] = tournament_name
        sets_df["date"] = date

        # if tournament_name == "evo-2023":
        #     sets_df["date"] = "2023-08-05"
        #     sets_df.loc[
        #         sets_df["bracketName"] == "Round 1 Pools", "date"
        #     ] = "2023-08-04"
        #     sets_df.loc[sets_df["bracketName"] == "Top 6", "date"] = "2023-08-06"

        sets_df.to_csv(
            out_path,
            index=False,
            sep="\t",
            lineterminator="\n",
        )
        return sets_df

    # save_sets(sets_df, [])
    # exit()

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


def get_country2code():
    country_df = pd.read_csv("./data/country_code.tsv", sep="\t", lineterminator="\n")
    return {row["name"]: row["code"] for row in country_df.to_dict("records")}


def acquire_users_info():
    country2code = get_country2code()

    def retrieve_player_info(player_id):
        QUERY = """query ($playerId: ID!) {
            player(id: $playerId) {
                gamerTag
                user {
                    location {
                        countryId
                        country
                    }
                    images {
                        id
                        type
                        width
                        height
                        ratio
                        url
                    }
                }
            }
        } """

        res = run_query(
            QUERY,
            variables={"playerId": player_id},
            header={"Authorization": "Bearer " + startgg_token},
            auto_retry=True,
        )
        # pprint(res)

        player = {
            "playerId": player_id,
            "gamerTag": "",
            "country": "",
            "countryCode": "",
            "imageUrl": "",
        }

        if res["data"]["player"] is None:
            return player

        player["gamerTag"] = res["data"]["player"]["gamerTag"]

        if res["data"]["player"]["user"] is None:
            return player

        if res["data"]["player"]["user"]["location"] is not None:
            player["country"] = res["data"]["player"]["user"]["location"]["country"]
            if type(player["country"]) != "str":
                player["country"] == ""
            if player["country"] in country2code:
                player["countryCode"] = country2code[player["country"]]

        if res["data"]["player"]["user"]["images"] is not None:
            images = res["data"]["player"]["user"]["images"]
            if len(images) == 0:
                return player
            for image in images:
                if image["type"] == "profile":
                    player["imageUrl"] = image["url"]
        return player

    player_df = pd.read_csv(conf.PLAYER_TSV_PATH, sep="\t", lineterminator="\n")
    player_info_df = pd.read_csv(
        conf.PLAYER_INFO_TSV_PATH, sep="\t", lineterminator="\n"
    )

    # まだinfoデータを取得していないプレイヤーのデータを取得する
    player_ids = set(player_df["playerId"].unique().tolist())
    exists_player_ids = set(player_info_df["playerId"].unique().tolist())
    new_player_ids = list(player_ids.difference(exists_player_ids))
    print("num of new_player_ids", len(new_player_ids))

    players = []
    for i, player_id in enumerate(new_player_ids):
        retry = 0
        while retry < 3:
            try:
                time.sleep(0.1)
                player = retrieve_player_info(int(player_id))
                players.append(player)
                break
            except Exception as e:
                print(e, "retry", retry, player_id)

        if retry >= 3:
            break

        if (i + 1) % 20 == 0:
            print(f"Progress {i+1}/{len(new_player_ids)}")

    df = pd.DataFrame(
        players,
        columns=["playerId", "gamerTag", "country", "countryCode", "imageUrl"],
    )
    player_info_df = pd.concat([player_info_df, df])

    player_info_df.to_csv(
        conf.PLAYER_INFO_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )


def set_and_check_player_country_code():
    country2code = get_country2code()
    player_info_df = pd.read_csv(
        conf.PLAYER_INFO_TSV_PATH, sep="\t", lineterminator="\n"
    )

    # set code
    player_info_df["countryCode"] = [
        country2code[country] if country in country2code else ""
        for country in player_info_df["country"].tolist()
    ]

    # 国コードが見つからなかった国名を表示
    player_info_df = player_info_df.fillna("")
    df = player_info_df[
        (player_info_df["country"] != "") & (player_info_df["countryCode"] == "")
    ]
    unconvertable_countries = df["country"].unique().tolist()
    if len(unconvertable_countries) > 0:
        print("[WARN] The following Countries could not find 'country code'.")
        pprint(unconvertable_countries)

    player_info_df.to_csv(
        conf.PLAYER_INFO_TSV_PATH, index=False, sep="\t", lineterminator="\n"
    )


if __name__ == "__main__":
    # acquire_entrants_data("evo-2023", "2023-08-06")
    # exit()

    acquire_users_info()
    exit()

    set_and_check_player_country_code()
    exit()

    # 試合結果取得。10000試合までしか取得できないのでsort順を変えて取得
    # acquire_tournament_results("evo-2023", "2023-08-06", "CALL_ORDER")
    # acquire_tournament_results("evo-2023", "2023-08-06", "RECENT")
