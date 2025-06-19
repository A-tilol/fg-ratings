import os

import collect_match_data
import collect_placement_data
import collect_player_data
import pandas as pd


def collect_event_data(event_slug: str, event_name: str):
    collect_match_data.collect_in_tsv(event_slug, event_name)
    collect_placement_data.collect_placements_in_tsv(event_slug, event_name)


def merge_all_events_data(events_dir="data/cpt_2025/events"):
    df_match = pd.DataFrame()
    df_placement = pd.DataFrame()
    for event_name in os.listdir(events_dir):
        event_dir = os.path.join(events_dir, event_name)
        if not os.path.isdir(event_dir):
            continue

        df_event_match = pd.read_csv(
            os.path.join(event_dir, "matches.tsv"),
            index_col=False,
            sep="\t",
            encoding="utf-8",
        )
        df_match = pd.concat([df_match, df_event_match])

        df_event_placement = pd.read_csv(
            os.path.join(event_dir, "placements.tsv"),
            index_col=False,
            sep="\t",
            encoding="utf-8",
        )
        df_placement = pd.concat([df_placement, df_event_placement])

    df_match = df_match.sort_values(by="Datetime(UTC)", ascending=False)
    df_match.to_csv(
        "data/cpt_2025/all_matches.tsv",
        index=False,
        encoding="utf-8",
        sep="\t",
        lineterminator="\n",
    )

    df_placement.to_csv(
        "data/cpt_2025/all_placements.tsv",
        index=False,
        encoding="utf-8",
        sep="\t",
        lineterminator="\n",
    )


def main(event_slug: str, event_name: str):
    print("大会データを取得")
    collect_event_data(event_slug, event_name)

    print("取得済み大会データを1ファイルにマージ")
    merge_all_events_data()

    print("新規プレイヤー情報を取得")
    collect_player_data.collect_in_tsv()


if __name__ == "__main__":
    main(
        event_slug="tournament/evo-japan-2025-presented-by-levtech/event/evo-japan-2025-street-fighter-6",
        event_name="EVO Japan 2025",
    )
