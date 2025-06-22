import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

try:
    df = pd.read_csv(
        "data/cpt_2025/player_ratings.tsv",
        sep="\t",
        index_col=False,
        encoding="utf-8",
        lineterminator="\n",
    )
except Exception as e:
    print(f"データの読み込み中にエラーが発生しました: {e}")
    print(
        "データ形式（区切り文字など）を確認してください。もしスペース区切りなら sep='\\s+' を試してください。"
    )
    exit()

# 'Rating' 列を数値型に変換 (変換できない値が含まれている場合に備えてエラー処理)
try:
    df["Rating"] = pd.to_numeric(df["Rating"])
except ValueError:
    print(
        "エラー: 'Rating' 列に数値に変換できない値が含まれています。データ内容を確認してください。"
    )
    exit()

# グラフのスタイルを設定 (見栄えを良くするため)
sns.set_style("whitegrid")

# レーティング分布の可視化
plt.figure(figsize=(12, 7))  # グラフのサイズを指定

# ヒストグラムとカーネル密度推定（KDE）をプロット
# bins='auto': データに基づいて適切なビンの数を自動で決定します。
# kde=True: カーネル密度推定の曲線を表示します。
sns.histplot(df["Rating"], bins="auto", kde=True, color="skyblue", edgecolor="black")

# グラフのタイトルと軸ラベルを設定 (英語表記)
plt.title("Distribution of Player Ratings", fontsize=16)
plt.xlabel("Rating", fontsize=14)
plt.ylabel("Frequency (Number of Players)", fontsize=14)


# グラフを表示
plt.show()

# 参考情報として、Rating列の基本的な統計量を表示
print("\n'Rating' 列の基本統計量:")
print(df["Rating"].describe())
