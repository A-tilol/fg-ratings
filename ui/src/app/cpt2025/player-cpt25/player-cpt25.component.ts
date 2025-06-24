import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexXAxis,
  ChartComponent,
} from 'ng-apexcharts';
import { forkJoin } from 'rxjs';
import { AssetLoadService } from '../asset-load.service';
import { Match, Placement, Player, Ratings } from '../interfaces';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
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
    private assetLoadService: AssetLoadService
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
      tooltip: {},
    };
  }

  ngOnInit(): void {
    this.playerId = this.route.snapshot.paramMap.get('id');
    if (this.playerId === null) {
      console.error('playerIdが取得できませんでした。');
      return;
    }

    forkJoin({
      idToRating: this.assetLoadService.loadCpt2025Ratings(),
      idToPlayer: this.assetLoadService.loadCpt2025Players(),
      placements: this.assetLoadService.loadCpt2025Placements(),
      matches: this.assetLoadService.loadCpt2025Matches(this.playerId),
    }).subscribe({
      next: ({ idToRating, idToPlayer, placements, matches }) => {
        this.playerData = this.createPlayerData(
          idToRating,
          idToPlayer,
          placements,
          matches
        );
        this.chartOptions = this.createRatingChartData(matches, idToPlayer);
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

  createRatingChartData(
    matches: Match[],
    idToPlayer: { [key: string]: Player }
  ): ChartOptions {
    matches.sort(
      (a, b) => new Date(a.Datetime).getTime() - new Date(b.Datetime).getTime()
    );

    let currentRating = 1500;
    let ratings = [currentRating];
    for (let match of matches) {
      if (match.Player1 === this.playerId) {
        currentRating += match.RateDiff;
      } else {
        currentRating -= match.RateDiff;
      }
      ratings.push(currentRating);
    }

    return {
      series: [
        {
          name: 'レーティング',
          data: ratings,
        },
      ],
      chart: {
        height: 350,
        type: 'line',
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -5,
        formatter: (val: string | number, opts: any) => {
          // opts.dataPointIndex は現在のデータポイントのインデックスです
          if (
            opts.dataPointIndex % 10 === 0 ||
            opts.dataPointIndex === ratings.length - 1
          ) {
            return val;
          } else {
            return ''; // または null を返して非表示にする
          }
        },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      title: {
        text: 'レーティング推移',
        align: 'left',
      },
      grid: {
        row: {
          colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
          opacity: 0.5,
        },
      },
      xaxis: {
        categories: [...new Array(ratings.length).keys()],
        labels: {
          formatter: function (val: string, timestamp: number, opts: any) {
            if (Number(val) % 5 === 0) return val;
            else return '';
          },
        },
      },
      tooltip: {
        x: {
          formatter: (val: number) => {
            return `通算${val}試合目`;
          },
        },
        y: {
          formatter: (val: number, opts) => {
            const match = matches[opts.dataPointIndex - 1];
            const sign = match.Player1 === this.playerId ? '+' : '-';
            return (
              `${val} (${sign}${match.RateDiff})<br><br>` +
              `${match.Event}<br>` +
              `${match.Bracket} ${match.Round}<br>` +
              `${idToPlayer[match.Player1].gamerTag} VS ${
                idToPlayer[match.Player2].gamerTag
              }`
            );
          },
          title: {
            formatter: (series) => {
              console.log(series);
              return '';
            },
          },
        },
      },
    };
  }

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
