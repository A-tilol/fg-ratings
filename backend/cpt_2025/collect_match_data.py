import datetime
import os
import re
import time

import pandas as pd
import startgg

PER_PAGE = 30  # 1ページあたりの取得セット数 (API上限に注意。通常50-100)

# --- GraphQL クエリ ---
QUERY_SETS = """
query EventSets($eventSlug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $eventSlug) {
    id
    name
    sets(
      page: $page
      perPage: $perPage
      sortType: RECENT # 最近完了した試合から取得
      filters: {
        state: 3 # 3: Completed (完了した試合のみ)
      }
    ) {
      pageInfo {
        totalPages
      }
      nodes {
        id
        completedAt   # 試合日時 (Unixタイムスタンプ)
        displayScore  # 表示用スコア文字列 (例: "PlayerA 3 - 0 PlayerB", "3-0", "DQ")
        winnerId
        fullRoundText # ラウンド名 (Winners Semi-Finalなど)
        phaseGroup {  # ブラケットの情報
          id
          phase {
            id
            name          # フェーズ名 (例: "Top 24")
          }
        }
        slots {
          id
          entrant {
            id
            name # プレイヤー名
            participants { # Entrant内の参加者リスト
              player {
                id       # これが playerId です
              }
            }
          }
        }
        games { # セット内の各ゲーム情報
          id
          selections { # キャラクター選択情報
            entrant {
                id
            }
            character {
              id
              name # キャラクター名
            }
          }
        }
      }
    }
  }
}
"""


def parse_scores(display_score_str, winner_id, p1_id, p2_id, p1_name, p2_name):
    """
    displayScore文字列からスコアを抽出し、プレイヤー1とプレイヤー2のスコアを返す。
    DQやForfeitも考慮する。
    """
    s1, s2 = "N/A", "N/A"
    ds_upper = display_score_str.upper()

    # DQ (Disqualified) や FF (Forfeit) の処理
    is_special_case = False
    if "DQ" in ds_upper or "DISQUALIFIED" in ds_upper or "FORFEIT" in ds_upper:
        is_special_case = True
        if winner_id == p1_id:
            s1, s2 = "W (DQ/FF)", "L (DQ/FF)"
        elif winner_id == p2_id:
            s1, s2 = "L (DQ/FF)", "W (DQ/FF)"
        else:  # winnerIdが不明な場合
            p1_mentioned = p1_name.upper() in ds_upper
            p2_mentioned = p2_name.upper() in ds_upper
            if p1_mentioned and not p2_mentioned:  # P1がDQ/FFと推定
                s1, s2 = "L (DQ/FF)", "W (DQ/FF)"
            elif p2_mentioned and not p1_mentioned:  # P2がDQ/FFと推定
                s1, s2 = "W (DQ/FF)", "L (DQ/FF)"
            else:  # 判断不可
                s1, s2 = "DQ/FF", "DQ/FF"

    if not is_special_case:
        # 数値スコアの抽出を試みる (例: "3 - 0", "PlayerA 2 - 1 PlayerB")
        score_numbers = re.findall(
            r"\b\d+\b", display_score_str
        )  # 単語境界を含む数字のみ
        if len(score_numbers) == 2:
            val1, val2 = int(score_numbers[0]), int(score_numbers[1])
            if winner_id == p1_id:  # Player 1 is winner
                s1, s2 = max(val1, val2), min(val1, val2)
            elif winner_id == p2_id:  # Player 2 is winner
                s1, s2 = min(val1, val2), max(val1, val2)
            else:  # winnerIdがない場合、スコアの出現順で仮に割り当て
                # (slotsの順序で左側がp1なら、displayScoreの左側がs1)
                # この部分はAPIのslots配列の順序とdisplayScoreの関連が不明なため、確実ではない。
                # 一般的には displayScore の左側が slot[0]、右側が slot[1] に対応することが多い。
                # 今回はp1_id,p2_idとslotsの対応は別途行うため、winnerIdがない場合は
                # スコアの大小関係だけでは割り当てられない。
                # displayScore文字列内のプレイヤー名の位置で判断も可能だが複雑になる。
                # ここでは単純にval1, val2をs1, s2に割り当てる (後でp1/p2に正しく振る)
                s1, s2 = val1, val2  # この時点では順序は仮
        elif winner_id:  # 数値スコアが取れないが勝者がいる場合
            if winner_id == p1_id:
                s1, s2 = "W", "L"
            elif winner_id == p2_id:
                s1, s2 = "L", "W"

    return s1, s2


def get_all_matches_data(event_slug, event_name):
    """指定されたイベントの全試合データを取得する"""
    all_matches = []
    current_page = 1
    total_pages = 1  # 初回リクエストで更新

    print(f"イベント '{event_slug}' の試合データを取得中...")

    while current_page <= total_pages:
        print(
            f"  ページ {current_page}/{total_pages if total_pages > 1 else '?'} を取得中..."
        )
        variables = {"eventSlug": event_slug, "page": current_page, "perPage": PER_PAGE}

        data = startgg.run_query(QUERY_SETS, variables)

        if not data or not data.get("event") or not data["event"].get("sets"):
            print("  データ取得失敗、または試合情報が見つかりませんでした。")
            break

        sets_page_data = data["event"]["sets"]
        if current_page == 1:
            total_pages = sets_page_data["pageInfo"]["totalPages"]
            # total_items = sets_page_data["pageInfo"]["totalItems"]
            print(f"  総ページ数: {total_pages}")
            if total_pages == 0:
                print("  このイベントには完了した試合データがありません。")
                break

        for set_node in sets_page_data["nodes"]:
            if (
                not set_node.get("slots")
                or len(set_node["slots"]) < 2
                or not set_node["slots"][0].get("entrant")
                or not set_node["slots"][1].get("entrant")
            ):
                # print(f"    セット {set_node.get('id', 'N/A')} はプレイヤー情報が不完全なためスキップします (例: BYE)。")
                continue

            # プレイヤー情報
            # APIのslots配列は必ずしもP1, P2の順とは限らないため、IDで識別
            slot1_entrant = set_node["slots"][0]["entrant"]
            slot2_entrant = set_node["slots"][1]["entrant"]

            # プレイヤー自身のID
            player1_id = slot1_entrant["participants"][0]["player"]["id"]
            player2_id = slot2_entrant["participants"][0]["player"]["id"]

            # 便宜上、slot[0] を Player 1、slot[1] を Player 2 とするが、
            # スコア割り当ては winnerId や displayScore の内容を考慮して行う
            p1_name = slot1_entrant["name"]
            p1_id = slot1_entrant["id"]
            p2_name = slot2_entrant["name"]
            p2_id = slot2_entrant["id"]

            # スコア情報
            display_score_str = set_node.get("displayScore", "N/A")
            winner_id = set_node.get("winnerId")

            # parse_scores は (displayScore内の左側スコア, 右側スコア) を返す想定
            # それを p1, p2 に正しく割り当てる
            raw_score1, raw_score2 = parse_scores(
                display_score_str, winner_id, p1_id, p2_id, p1_name, p2_name
            )

            score_p1, score_p2 = "N/A", "N/A"
            # displayScoreが "P1Name S1 - S2 P2Name" の形式か "S1 - S2" の形式かで処理
            # S1, S2 の順がslot[0], slot[1]に対応すると仮定
            # スコア文字列が数値の場合は数値に変換
            try:
                # プレイヤー名がdisplayScoreの左側か右側かで判断する (より複雑なロジックも可能)
                # ここではwinnerIdがあるならそれに基づいて割り当て、なければslot順と仮定
                if winner_id == p1_id:  # p1が勝者
                    score_p1, score_p2 = (
                        raw_score1,
                        raw_score2,
                    )  # parse_scoresが勝者側にWを割り当てている
                elif winner_id == p2_id:  # p2が勝者
                    score_p1, score_p2 = (
                        raw_score1,
                        raw_score2,
                    )  # parse_scoresが勝者側にWを割り当てている
                else:  # winnerIdがない場合 (例: 引き分け、または特殊なスコア表示)
                    # parse_scores が "N/A" を返しているか、"DQ/FF" など
                    score_p1, score_p2 = raw_score1, raw_score2
                    # もし parse_scores が純粋な数字ペアを返し、slot[0]がp1でない場合、入れ替える
                    if (
                        isinstance(raw_score1, int)
                        and isinstance(raw_score2, int)
                        and p1_id != slot1_entrant["id"]
                    ):
                        score_p1, score_p2 = (
                            raw_score2,
                            raw_score1,
                        )  # これは不要。p1_idは常にslot1_entrant['id']のため

            except ValueError:  # スコアが数値でない場合 (W/L, DQ/FFなど)
                score_p1, score_p2 = raw_score1, raw_score2

            # 試合日時
            completed_at_unix = set_node.get("completedAt")
            match_datetime = "N/A"
            if completed_at_unix:
                try:
                    match_datetime = datetime.datetime.fromtimestamp(
                        completed_at_unix, tz=datetime.timezone.utc
                    ).strftime("%Y-%m-%d %H:%M:%S UTC")
                except TypeError:
                    match_datetime = "Invalid Timestamp"

            # ブラケット名
            bracket_name = ""
            phase_group_node = set_node.get("phaseGroup")
            if (
                phase_group_node
                and phase_group_node.get("phase")
                and phase_group_node["phase"].get("name")
            ):
                bracket_name += phase_group_node["phase"]["name"].strip()

            # ラウンド名
            round_name = set_node.get("fullRoundText", "N/A")

            # 使用キャラクター情報
            p1_chars = set()
            p2_chars = set()
            if set_node.get("games"):
                for game in set_node["games"]:
                    if game.get("selections"):
                        for selection in game["selections"]:
                            if selection.get("character") and selection[
                                "character"
                            ].get("name"):
                                char_name = selection["character"]["name"]
                                selected_entrant_id = selection["entrant"]["id"]
                                if selected_entrant_id == p1_id:
                                    p1_chars.add(char_name)
                                elif selected_entrant_id == p2_id:
                                    p2_chars.add(char_name)

            p1_chars_str = ", ".join(sorted(list(p1_chars))) if p1_chars else "N/A"
            p2_chars_str = ", ".join(sorted(list(p2_chars))) if p2_chars else "N/A"

            if winner_id == p2_id:
                player1_id, player2_id = player2_id, player1_id
                p1_chars_str, p2_chars_str = p2_chars_str, p1_chars_str
                score_p1, score_p2 = score_p2, score_p1

            all_matches.append(
                {
                    "Event": event_name,
                    "Player1": player1_id,
                    "Player1Chars": p1_chars_str,
                    "Player1Score": score_p1,
                    "Player2": player2_id,
                    "Player2Chars": p2_chars_str,
                    "Player2Score": score_p2,
                    "Datetime(UTC)": match_datetime,
                    "Bracket": bracket_name,
                    "Round": round_name,
                    # "Raw Display Score": display_score_str, # デバッグ用
                    # "Set ID": set_node.get('id') # デバッグ用
                }
            )

        current_page += 1
        if current_page <= total_pages:
            # return all_matches
            time.sleep(startgg.REQUEST_DELAY)  # APIレート制限対策

    return all_matches


def collect_in_tsv(event_slug, event_name, save_root_dir="data/cpt_2025/events"):
    match_data = get_all_matches_data(event_slug, event_name)

    if match_data:
        print(f"\n取得した総試合数: {len(match_data)}")

        # Pandas DataFrameに変換してCSVファイルとして保存
        df = pd.DataFrame(match_data)

        # 列の順序を整える
        column_order = [
            "Datetime(UTC)",
            "Event",
            "Bracket",
            "Round",
            "Player1",
            "Player2",
            "Player1Score",
            "Player2Score",
            "Player1Chars",
            "Player2Chars",
            # "Raw Display Score", "Set ID" # デバッグ用
        ]
        df = df[column_order]

        save_dir = os.path.join(save_root_dir, event_name)
        os.makedirs(save_dir, exist_ok=True)
        output_file_path = os.path.join(save_dir, "matches.tsv")
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
    else:
        print("試合データを取得できませんでした。")


if __name__ == "__main__":
    collect_in_tsv(
        event_slug="tournament/combo-breaker-2025/event/street-fighter-6",
        event_name="COMBO BREAKER 2025",
        save_root_dir="./data/events",
    )
