import os
import time

import pandas as pd
import startgg

PLACE_TO_CPT_POINT = {
    2: 300,
    3: 250,
    4: 200,
    5: 150,
    7: 100,
    9: 50,
    13: 30,
    17: 20,
    25: 10,
}

# GraphQLクエリ: イベントの参加者と順位を取得
EVENT_STANDINGS_QUERY = """
query EventStandings($eventSlug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $eventSlug) {
    id
    name
    entrants(query: {
      page: $page
      perPage: $perPage
      sortBy: "standing"
    }) {
      pageInfo {
        totalPages
        total # 総参加Entrant数
      }
      nodes { # 各Entrant (参加単位: 個人またはチーム)
        id # Entrant ID
        name
        standing {
          id
          placement # 最終順位
        }
        participants {
          player {
            id # Player ID
          }
        }
      }
    }
  }
}
"""


def get_all_event_participants_placements(event_slug, event_name, per_page=75):
    """
    指定されたイベントの全参加者のplayerIdとfinalPlacementを取得する。
    per_page: 1ページあたりの取得件数 (start.ggのAPIは最大100が多いが、75程度が安全)
    """
    all_participants_info = []
    current_page = 1
    total_pages = 1  # 初期値。最初のレスポンスで更新される

    print(f"Fetching participant standings for event: {event_slug}")

    while current_page <= total_pages:
        variables = {"eventSlug": event_slug, "page": current_page, "perPage": per_page}

        print(
            f"Fetching page {current_page}{' of ' + str(total_pages) if total_pages > 1 and current_page > 1 else ''}..."
        )

        response_data = startgg.run_query(EVENT_STANDINGS_QUERY, variables)

        event_data = response_data.get("event")
        if not event_data:
            print(
                f"No event data found for slug: {event_slug}. The slug might be incorrect or the event is not accessible."
            )
            break

        entrants_data = event_data.get("entrants")
        if not entrants_data:
            print(
                f"No entrants data found for event: {event_data.get('name', event_slug)}"
            )
            if current_page == 1:  # 初回でentrantsがなければ参加者0
                print(
                    "This event appears to have no entrants or entrant data is not available."
                )
            break

        if current_page == 1:  # 初回リクエスト時のみページ情報等を設定
            page_info = entrants_data.get("pageInfo", {})
            total_pages = page_info.get("totalPages", 1)
            total_entrants = page_info.get("total", 0)
            print(f"Event: {event_data.get('name')}")
            print(
                f"Total Entrants (teams/individuals): {total_entrants}, Total Pages: {total_pages}"
            )
            if total_entrants == 0:
                print("No entrants registered for this event.")
                break

        for entrant_node in entrants_data.get("nodes", []):
            placement = None
            # standing情報が存在し、かつplacementが数値であるかを確認
            if entrant_node.get("standing") and isinstance(
                entrant_node["standing"].get("placement"), int
            ):
                placement = entrant_node["standing"]["placement"]

            for participant in entrant_node.get("participants", []):
                player = participant.get("player")
                if player and player.get("id"):
                    participant_info = {
                        "Event": event_name,
                        "PlayerId": player["id"],
                        "EntrantName": entrant_node.get("name"),  # 参考: Entrant名
                        "FinalPlacement": placement,  # Noneの場合もあり得る
                        "CPTPoint": PLACE_TO_CPT_POINT.get(placement, 0),
                    }
                    all_participants_info.append(participant_info)

        if current_page >= total_pages:
            break  # 全ページ取得完了

        current_page += 1

        # レートリミットを避けるための短い待機 (任意、必要に応じて調整)
        # break
        time.sleep(startgg.REQUEST_DELAY)

    if not all_participants_info:
        return []

    # 順位でソート (Noneの順位は最後に)
    return sorted(
        all_participants_info,
        key=lambda x: (x["FinalPlacement"] is None, x["FinalPlacement"]),
    )


def collect_placements_in_tsv(
    event_slug: str, event_name: str, save_root_dir="data/cpt_2025/events"
):
    participants_data = get_all_event_participants_placements(event_slug, event_name)

    if not participants_data:
        print(
            f"\nイベント '{event_slug}' から参加者情報を取得できませんでした、または参加者がいませんでした。"
            "イベントスラッグが正しいか、イベントが公開されているか確認してください。"
        )
        exit()

    print(f"\n--- 取得結果 (総プレイヤー数: {len(participants_data)}) ---")

    df = pd.DataFrame(participants_data)

    # 列の順序を整える
    column_order = [
        "Event",
        "FinalPlacement",
        "CPTPoint",
        "PlayerId",
        # "entrantName",
    ]
    df = df[column_order]

    save_dir = os.path.join(save_root_dir, event_name)
    os.makedirs(save_dir, exist_ok=True)
    output_file_path = os.path.join(save_dir, "placements.tsv")
    try:
        df.to_csv(
            output_file_path,
            index=False,
            encoding="utf-8",
            sep="\t",
            lineterminator="\n",
        )
        print(f"試合データを {output_file_path} に保存しました。")
    except Exception as e:
        print(f"CSVファイルへの保存中にエラーが発生しました: {e}")

    print("\n取得データサンプル (最初の5件):")
    print(df.head().to_string())


# --- 実行例 ---
if __name__ == "__main__":
    collect_placements_in_tsv(
        event_slug="tournament/combo-breaker-2025/event/street-fighter-6",
        event_name="COMBO BREAKER 2025",
        save_root_dir="./data/events",
    )
