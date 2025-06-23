import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTitleSubtitle,
  ApexXAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { forkJoin, map, Observable } from 'rxjs';
import { Placement, Player, Ratings } from '../ratings/ratings.component';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

interface Result {
  event: string;
  placement: number;
}

export interface PlayerData {
  gamerTag: string;
  countryCode: string;
  birthDay: string;
  charactors: string;
  rank: number;
  latestRating: number;
  bestRating: number;
  worstRating: number;
  winRate: number;
  winN: number;
  loseN: number;
  results: Result[];
}

export interface BattleRecord {
  date: string;
  SFLStage: number;
  SFLQuarter: number;
  SFLMatch: number;
  SFLBattle: number;
  isWin: boolean;
  winSetN: number;
  loseSetN: number;
  opponentName: string;
  opponentRating?: number;
  ratingDiff?: number;
}

export interface WinRateRecord {
  opponentName: string;
  opponentRating: number;
  rateDiff: number;
  winRate: string;
}

interface Match {
  Datetime: string;
  Event: string;
  Bracket: string;
  Round: string;
  Player1: string;
  Player2: string;
  Player1Score: string;
  Player2Score: string;
  Player1Chars: string;
  Player2Chars: string;
}

@Component({
  selector: 'app-player-cpt25',
  templateUrl: './player-cpt25.component.html',
  styleUrls: ['./player-cpt25.component.scss'],
})
export class PlayerCpt25Component {
  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: ChartOptions;

  playerId: string | null = '';
  playerData: PlayerData = {
    gamerTag: '',
    countryCode: '',
    birthDay: '',
    charactors: '',
    rank: 0,
    latestRating: 0,
    bestRating: 0,
    worstRating: 0,
    winRate: 0,
    winN: 0,
    loseN: 0,
    results: [],
  };

  battleRecordTableData: BattleRecord[] = [];
  displayedColumns: string[] = ['date', 'SFLMatchName', 'result', 'opponent'];

  winRateTableData: WinRateRecord[] = [];
  winRateTableColumns: string[] = [
    'opponentName',
    'opponentRating',
    'rateDiff',
    'winRate',
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    this.chartOptions = {
      series: [
        {
          name: 'レーティング',
          data: [0],
        },
      ],
      chart: {
        type: 'line',
      },
      dataLabels: {},
      stroke: {},
      title: {},
      grid: {},
      xaxis: {},
    };
  }

  public loadAssetTsvToJson(filePath: string): Observable<any[]> {
    return this.http.get(filePath, { responseType: 'text' }).pipe(
      map((tsvData) => {
        const lines = tsvData.split('\n');
        const headers = lines[0].split('\t');
        lines.shift();

        const data = [];
        for (const line of lines) {
          if (line === '') continue;
          const values = line.split('\t');
          const d: { [key: string]: any } = {};
          headers.forEach((colName, i) => {
            d[colName] = values[i];
          });
          data.push(d);
        }

        return data;
      })
    );
  }

  public loadCpt2025Ratings(): Observable<{ [key: string]: Ratings }> {
    const filePath = 'assets/cpt_2025/player_ratings.tsv';
    return this.loadAssetTsvToJson(filePath).pipe(
      map((playerRatings) => {
        const idToRating: { [key: string]: Ratings } = {};
        playerRatings.forEach((rating, i) => {
          idToRating[rating.PlayerId] = {
            rank: i + 1,
            rating: Number(rating.Rating),
            winCnt: Number(rating.WinCnt),
            loseCnt: Number(rating.LoseCnt),
          };
        });
        return idToRating;
      })
    );
  }

  public loadCpt2025Players(): Observable<{ [key: string]: Player }> {
    const filePath = 'assets/cpt_2025/all_player.tsv';
    return this.loadAssetTsvToJson(filePath).pipe(
      map((players) => {
        const idToPlayer: { [key: string]: Player } = {};
        for (const player of players) {
          idToPlayer[player.PlayerId] = {
            gamerTag: player.GamerTag,
            countryCode: player.CountryCode,
            birthday: player.Birthday,
          };
        }
        return idToPlayer;
      })
    );
  }

  public loadCpt2025Placements(): Observable<Placement[]> {
    const filePath = 'assets/cpt_2025/all_placements.tsv';
    return this.loadAssetTsvToJson(filePath).pipe(
      map((placements) => {
        const data: Placement[] = [];
        for (const placement of placements) {
          data.push({
            placement: Number(placement.FinalPlacement),
            cptPoint: Number(placement.CPTPoint),
            event: placement.Event,
            playerId: placement.PlayerId,
          });
        }
        return data;
      })
    );
  }

  public loadCpt2025Matches(): Observable<Match[]> {
    const filePath = 'assets/cpt_2025/all_matches.tsv';
    return this.loadAssetTsvToJson(filePath).pipe(
      map((matches) => {
        const data: Match[] = [];
        for (const match of matches) {
          if (
            match.Player1 !== this.playerId &&
            match.Player2 !== this.playerId
          )
            continue;

          data.push({
            Datetime: match['Datetime(UTC)'],
            Event: match.Event,
            Bracket: match.Bracket,
            Round: match.Round,
            Player1: match.Player1,
            Player2: match.Player2,
            Player1Score: match.Player1Score,
            Player2Score: match.Player2Score,
            Player1Chars: match.Player1Chars,
            Player2Chars: match.Player2Chars,
          });
        }
        return data;
      })
    );
  }

  ngOnInit(): void {
    this.playerId = this.route.snapshot.paramMap.get('id');

    forkJoin({
      idToRating: this.loadCpt2025Ratings(),
      idToPlayer: this.loadCpt2025Players(),
      placements: this.loadCpt2025Placements(),
      matches: this.loadCpt2025Matches(),
    }).subscribe({
      next: ({ idToRating, idToPlayer, placements, matches }) => {
        this.playerData = this.createPlayerData(
          idToRating,
          idToPlayer,
          placements,
          matches
        );
      },
      error: (error) => {
        console.error('データロード中にエラーが発生しました:', error);
      },
      complete: () => {
        console.log('forkJoin購読完了');
      },
    });
  }

  createPlayerData(
    idToRating: { [key: string]: Ratings },
    idToPlayer: { [key: string]: Player },
    placements: Placement[],
    matches: Match[]
  ) {
    if (this.playerId === null) return this.playerData;

    // 対戦データからcharを抽出
    const charSet = new Set();
    for (const match of matches) {
      let chars = '';
      if (match.Player1 === this.playerId && match.Player1Chars !== '') {
        chars = match.Player1Chars;
      }
      if (match.Player2 === this.playerId && match.Player2Chars !== '') {
        chars = match.Player2Chars;
      }
      if (chars === '') continue;
      for (const char of chars.split(',')) {
        charSet.add(char.trim());
      }
    }
    const chars = [...charSet];

    // 主な戦績を抽出
    const playerPlacements = placements.filter((placement) => {
      return placement.playerId === this.playerId;
    });
    const results: Result[] = [];
    for (const place of playerPlacements) {
      results.push({
        event: place.event,
        placement: place.placement,
      });
    }

    // プレイヤーデータを作成
    const rating = idToRating[this.playerId];
    const player = idToPlayer[this.playerId];
    const data: PlayerData = {
      gamerTag: player.gamerTag,
      countryCode: player.countryCode,
      birthDay: player.birthday,
      charactors: chars.join(', '),
      rank: rating.rank,
      latestRating: rating.rating,
      bestRating: -1,
      worstRating: -1,
      winRate: Math.round(
        (rating.winCnt / (rating.winCnt + rating.loseCnt)) * 100
      ),
      winN: rating.winCnt,
      loseN: rating.loseCnt,
      results: results,
    };

    return data;
  }

  // ngOnInit(): void {
  //   this.playerName = this.route.snapshot.paramMap.get('name');

  //   this.http
  //     .get('assets/sfl_2023/players.tsv', { responseType: 'text' })
  //     .subscribe((playerTsv) => {
  //       this.http
  //         .get('assets/sfl_2023/player_data.tsv', { responseType: 'text' })
  //         .subscribe((playerDataTsv) => {
  //           this.playerData = this.loadPlayerData(playerTsv, playerDataTsv);
  //           console.log(this.playerData);

  //           this.winRateTableData = this.createWinRateTableData(playerDataTsv);
  //           console.log(this.winRateTableData);
  //         });
  //     });

  //   this.http
  //     .get('assets/sfl_2023/ratings.tsv', { responseType: 'text' })
  //     .subscribe((ratingsTsv) => {
  //       this.chartOptions = this.createRatingChartData(ratingsTsv);
  //       console.log(this.chartOptions);
  //     });

  //   this.http
  //     .get('assets/sfl_2023/results.tsv', { responseType: 'text' })
  //     .subscribe((resultsTsv) => {
  //       this.battleRecordTableData = this.createBattleRecordData(resultsTsv);
  //       console.log(this.battleRecordTableData);
  //     });
  // }

  // loadPlayerData(playerTsv: string, playerDataTsv: string): PlayerData {
  //   let playerLines = playerTsv.split('\n');
  //   playerLines.shift();
  //   let playerValues: string[] = [];
  //   for (let line of playerLines) {
  //     const values = line.split('\t');
  //     if (values.length == 0) continue;
  //     if (values[0] == this.playerName) {
  //       playerValues = values;
  //       break;
  //     }
  //   }
  //   console.assert(playerValues.length > 0);

  //   let PlayerDatalines = playerDataTsv.split('\n');
  //   PlayerDatalines.shift();
  //   let playerDataValues: string[] = [];
  //   for (let line of PlayerDatalines) {
  //     const values = line.split('\t');
  //     if (values.length == 0) continue;
  //     if (values[0] == this.playerName) {
  //       playerDataValues = values;
  //       break;
  //     }
  //   }
  //   console.assert(playerDataValues.length > 0);

  //   const data: PlayerData = {
  //     twitterId: playerValues[6],
  //     charactors: playerValues[7],
  //     rank: Math.round(Number(playerDataValues[6])),
  //     latestRating: Math.round(Number(playerDataValues[2])),
  //     bestRating: Math.round(Number(playerDataValues[3])),
  //     worstRating: Math.round(Number(playerDataValues[4])),
  //     winRate: Math.round(Number(playerDataValues[9]) * 100),
  //     winN: Math.round(Number(playerDataValues[11])),
  //     loseN: Math.round(Number(playerDataValues[12])),
  //   };
  //   return data;
  // }

  // createRatingChartData(ratingsTsv: string): ChartOptions {
  //   let lines = ratingsTsv.split('\n');
  //   lines.shift();

  //   let dateToRatings: { [key: string]: number } = {};
  //   for (let line of lines) {
  //     const values = line.split('\t');
  //     if (values.length == 0) continue;
  //     if (values[1] != this.playerName) continue;

  //     const date: string = values[0];
  //     const rating: number = Number(values[2]);

  //     if (date in dateToRatings) continue;

  //     dateToRatings[date] = rating;
  //   }

  //   return {
  //     series: [
  //       {
  //         name: 'レーティング',
  //         data: Object.values(dateToRatings).reverse(),
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: 'line',
  //       zoom: {
  //         enabled: false,
  //       },
  //     },
  //     dataLabels: {
  //       enabled: true,
  //     },
  //     stroke: {
  //       curve: 'straight',
  //     },
  //     title: {
  //       text: 'レーティング推移',
  //       align: 'left',
  //     },
  //     grid: {
  //       row: {
  //         colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
  //         opacity: 0.5,
  //       },
  //     },
  //     xaxis: {
  //       categories: Object.keys(dateToRatings).reverse(),
  //     },
  //   };
  // }

  // createWinRateTableData(playerDataTsv: string): WinRateRecord[] {
  //   let lines = playerDataTsv.split('\n');
  //   lines.shift();

  //   let winRateRecords: WinRateRecord[] = [];
  //   for (let line of lines) {
  //     const values = line.split('\t');
  //     if (values.length < 2) continue;
  //     if (values[0] == this.playerName) continue;

  //     const rating: number = Number(values[2]);

  //     const winRate = (
  //       Math.round(
  //         (1 / (1 + 10 ** ((rating - this.playerData.latestRating) / 400))) *
  //           1000
  //       ) / 10
  //     ).toFixed(1);

  //     const wrr: WinRateRecord = {
  //       opponentName: values[0],
  //       opponentRating: rating,
  //       rateDiff: this.playerData.latestRating - rating,
  //       winRate: winRate,
  //     };
  //     winRateRecords.push(wrr);
  //   }

  //   return winRateRecords;
  // }

  // createBattleRecordData(resultsTsv: string): BattleRecord[] {
  //   let lines = resultsTsv.split('\n');
  //   lines.shift();

  //   let battleRecords = [];
  //   for (let line of lines) {
  //     const values = line.split('\t');
  //     if (values.length == 0) continue;

  //     const winner = values[4];
  //     const loser = values[5];
  //     if (winner != this.playerName && loser != this.playerName) continue;

  //     const isWin = this.playerName == winner;

  //     let winSetN, loseSetN, opponentName;
  //     if (isWin) {
  //       winSetN = Number(values[6]);
  //       loseSetN = Number(values[7]);
  //       opponentName = loser;
  //     } else {
  //       winSetN = Number(values[7]);
  //       loseSetN = Number(values[6]);
  //       opponentName = winner;
  //     }

  //     const br: BattleRecord = {
  //       date: values[3],
  //       SFLStage: Number(values[0]),
  //       SFLQuarter: Number(values[1]),
  //       SFLMatch: Number(values[2]),
  //       SFLBattle: Number(values[8]),
  //       isWin: isWin,
  //       winSetN: winSetN,
  //       loseSetN: loseSetN,
  //       opponentName: opponentName,
  //       // opponentRating?:,
  //       // ratingDiff?:,
  //     };
  //     battleRecords.push(br);
  //   }

  //   battleRecords.sort((a, b) => {
  //     if (a.date < b.date) return 1;
  //     if (a.date > b.date) return -1;
  //     if (a.SFLBattle < b.SFLBattle) return 1;
  //     return -1;
  //   });

  //   return battleRecords;
  // }

  // openTwitter() {
  //   const url = `https://twitter.com/${this.playerData.twitterId}`;
  //   window.open(url, '_blank');
  // }

  // navigateToPlayerComponent(playerName: string) {
  //   this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
  //     this.router.navigate(['/player', playerName]);
  //   });
  // }

  // getWinrateColor(winRate: string) {
  //   const wrate = Number(winRate);

  //   if (wrate > 90) return 'color: #550000';
  //   else if (wrate > 80) return 'color: #880000';
  //   else if (wrate > 70) return 'color: #AA0000';
  //   else if (wrate > 60) return 'color: #CC0000';
  //   else if (wrate > 55) return 'color: #EE0000';
  //   else if (wrate > 45) return 'color: #00BB00';
  //   else if (wrate > 40) return 'color: #0000EE';
  //   else if (wrate > 30) return 'color: #0000CC';
  //   else if (wrate > 20) return 'color: #0000AA';
  //   else if (wrate > 10) return 'color: #000088';
  //   else return 'color: #000055';
  // }
}
