"""試合結果をカプコン公式サイトからスクレイピング

このスクリプトを実行したのち、
main.pyを実行することでデータ集計を行う
"""

import time

import conf
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


def get_player_result(elm) -> dict:
    # プレイヤー情報を取得
    player_name = elm.find_element("css selector", ".font-size14").text
    charactor_elms = elm.find_elements("css selector", ".character-name")
    charactors = list(set([e.text for e in charactor_elms]))
    total_wins = len(elm.find_elements("css selector", "ul.win"))

    return {
        "player_name": player_name,
        "charactor_names": charactors,
        "total_wins": total_wins,
    }


def aquire_battle_result(battle_elm, date, stage, section, match, battle):
    # プレイヤー情報を取得
    left_box = battle_elm.find_element("css selector", ".left-box")
    left_player_result = get_player_result(left_box)

    right_box = battle_elm.find_element("css selector", ".right-box")
    right_player_result = get_player_result(right_box)

    winner, loser = left_player_result, right_player_result
    if right_player_result["total_wins"] > left_player_result["total_wins"]:
        winner, loser = right_player_result, left_player_result

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


def aquire_section_results(date, stage, section_num):
    """節の試合結果を取得しTSV形式で保存する

    Args:
        date (_type_): _description_
        stage (_type_): _description_
        section_num (_type_): _description_
    """
    # 指定されたURLを開く
    url = f"https://sf.esports.capcom.com/schedule/sfl2023/sec{section_num}/"
    driver.get(url)
    time.sleep(5)

    match = 1
    match_elements = driver.find_elements(By.CLASS_NAME, "results-2023__detail")
    battle_results = []
    for match_elm in match_elements:
        # 試合結果の詳細を展開
        driver.execute_script(
            f'document.getElementsByClassName("openBtn")[{match-1}].click();'
        )
        # match_elm.find_element(By.CLASS_NAME, "openBtn").click() なぜかエラーになる場合がある
        time.sleep(1)

        battle_elems = match_elm.find_elements(By.CLASS_NAME, "detail-match")
        battle = 1
        for battle_elem in battle_elems:
            battle_result = aquire_battle_result(
                battle_elem, date, stage, section_num, match, battle
            )
            battle_results.append(battle_result)
            battle += 1
        match += 1

    results_df = pd.DataFrame(battle_results)
    results_df.to_csv(
        f"{conf.SFL_2023_RESULTS_DIR}/stage{stage}_sec{section_num}.tsv",
        index=False,
        sep="\t",
        lineterminator="\n",
    )


if __name__ == "__main__":
    chrome_options = Options()
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)

    # aquire_section_results(date="2023-07-07", stage=1, section_num=1)
    # aquire_section_results(date="2023-07-14", stage=1, section_num=2)
    # aquire_section_results(date="2023-07-18", stage=1, section_num=3)
    # aquire_section_results(date="2023-08-15", stage=1, section_num=4)
    # aquire_section_results(date="2023-08-18", stage=1, section_num=5)
    # aquire_section_results(date="2023-08-22", stage=1, section_num=6)
    # aquire_section_results(date="2023-08-25", stage=1, section_num=7)
    # aquire_section_results(date="2023-08-29", stage=1, section_num=8)
    aquire_section_results(date="2023-09-01", stage=1, section_num=9)

    driver.quit()
