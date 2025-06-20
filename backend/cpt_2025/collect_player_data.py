import json
import os
import time

import pandas as pd
import startgg

QUERY = """
query PlayerInfo($playerId: ID!) {
  player(id: $playerId) {
    id
    gamerTag
    user {
      id
      discriminator
      bio
      birthday
      location {
        country
      }
    }
  }
}
"""


def get_all_player_ids(placements_tsv_path: str):
    df_placement = pd.read_csv(
        placements_tsv_path,
        sep="\t",
        encoding="utf-8",
        index_col=False,
        dtype={"PlayerId": "str"},
    )
    return set(df_placement.PlayerId.unique())


def fetch_new_players_data(new_player_ids: list) -> list[dict]:
    country_to_code = json.load("data/country_code.json")

    players_data = []
    for i, player_id in enumerate(new_player_ids):
        print(f"プレイヤー {player_id} の情報を取得 ({i+1}/{len(new_player_ids)})")
        player_data = startgg.run_query(QUERY, {"playerId": player_id})["player"]
        country = ""
        birthday = ""
        if (
            player_data.get("user")
            and player_data["user"].get("location")
            and player_data["user"]["location"].get("country")
        ):
            country = player_data["user"]["location"]["country"]
        if player_data.get("user") and player_data["user"].get("birthday"):
            birthday = player_data["user"]["birthday"]
        players_data.append(
            {
                "PlayerId": player_id,
                "GamerTag": player_data["gamerTag"],
                "CountryCode": (
                    country_to_code[country] if country in country_to_code else ""
                ),
                "Birthday": birthday,
            }
        )
        time.sleep(startgg.REQUEST_DELAY)
    return players_data


def collect_in_tsv(
    placements_tsv_path="data/cpt_2025/all_placements.tsv",
    player_tsv_path="data/cpt_2025/all_player.tsv",
):
    print("プレイヤーデータの取得処理を開始")
    print("現取得データのすべてのプレイヤーIDをリストする")
    all_player_ids = get_all_player_ids(placements_tsv_path)
    print(f"{len(all_player_ids)=}")

    print("データ取得済みのプレイヤーIDをリストする")
    df_player = None
    existing_player_ids = set()
    if os.path.exists(player_tsv_path):
        df_player = pd.read_csv(
            player_tsv_path,
            sep="\t",
            encoding="utf-8",
            index_col=False,
            dtype={"PlayerId": "str"},
        )
        existing_player_ids = set(df_player.PlayerId.unique())
    print(f"{len(existing_player_ids)=}")

    print("新規にデータ取得するプレイヤーIDをリストする")
    new_player_ids = all_player_ids - existing_player_ids
    print(f"{len(new_player_ids)=}")

    if len(new_player_ids) == 0:
        print("新規プレイヤーがいないため処理を終了します")
        return

    print("プレイヤーデータを所得")
    new_players_data = fetch_new_players_data(list(new_player_ids))
    print(f"{len(new_players_data)=}")

    df_new_player = pd.DataFrame(new_players_data)

    # 列の順序を整える
    column_order = [
        "PlayerId",
        "GamerTag",
        "CountryCode",
        "Birthday",
    ]
    df_new_player = df_new_player[column_order]

    print("新規データと既存データを結合")
    if df_player is not None:
        df_player = pd.concat([df_player, df_new_player])
    else:
        df_player = df_new_player
    print(df_player.head())

    print("PlayerIdでソート")
    df_player.PlayerId = df_player.PlayerId.astype("int64")
    df_player = df_player.sort_values(by="PlayerId")

    try:
        df_player.to_csv(
            player_tsv_path,
            index=False,
            encoding="utf-8",
            sep="\t",
            lineterminator="\n",
        )
        print(f"試合データを {player_tsv_path} に保存しました。")
    except Exception as e:
        print(f"CSVファイルへの保存中にエラーが発生しました: {e}")


if __name__ == "__main__":
    collect_in_tsv()
