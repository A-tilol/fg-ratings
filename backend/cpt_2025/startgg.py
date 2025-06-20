import json
import os
import time

import requests

API_TOKEN = os.getenv("STARTGG_API_TOKEN")

SAVE_DIR = "./data/events"

API_URL = "https://api.start.gg/gql/alpha"
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "PythonStartGGClient/1.0",  # 任意ですが推奨
}
REQUEST_DELAY = 60 / 80  # リクエスト間の遅延時間（秒）


def run_query(query, variables):
    """GraphQLクエリを実行し、結果を返す"""

    for attempt in range(3):  # 簡易リトライ処理 (最大3回)
        try:
            response = requests.post(
                API_URL, json={"query": query, "variables": variables}, headers=HEADERS
            )
            response.raise_for_status()  # HTTPエラーがあれば例外を発生
            data = response.json()
            if "errors" in data:
                print(f"GraphQL Errors (attempt {attempt+1}): {data['errors']}")
                # 特定のエラーコード(例:レート制限)なら待機時間を増やすなどの処理も可能
            else:
                return data.get("data")
        except requests.exceptions.HTTPError as e:
            print(
                f"HTTP Error (attempt {attempt+1}): {e.response.status_code} - {e.response.text[:200]}"
            )
        except requests.exceptions.RequestException as e:
            print(f"Request failed (attempt {attempt+1}): {e}")
        except json.JSONDecodeError as e:
            print(f"JSON decode failed (attempt {attempt+1}): {e}")
            print(
                f"Response status code: {response.status_code if 'response' in locals() else 'N/A'}"
            )
            print(
                f"Response text: {response.text[:500] if 'response' in locals() else 'N/A'}..."
            )

        if attempt < 2:  # 最後のリトライでなければ待機
            time.sleep(5 * (attempt + 1))  # 指数バックオフ

    return None
