import calc_ratings
import collect_startgg_data


def main(event_slug: str, event_name: str):
    print(f"{event_name} の大会データを収集")
    collect_startgg_data.main(event_slug, event_name)

    print("全イベントの試合結果からレートを再集計")
    calc_ratings.create_rating_data()


if __name__ == "__main__":
    main(
        event_slug="tournament/evo-2025/event/street-fighter-6",
        event_name="EVO 2025",
    )
