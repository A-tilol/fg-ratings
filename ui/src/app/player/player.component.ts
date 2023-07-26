import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
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

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

export interface PlayerData {
  twitterId: string;
  charactors: string;
  rank: number;
  latestRating: number;
  bestRating: number;
  worstRating: number;
  winRate: number;
  winN: number;
  loseN: number;
}

export interface BattleRecord {
  date: string;
  SFLStage: number;
  SFLQuarter: number;
  SFLMatch: number;
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
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: ChartOptions;

  playerName: string | null = '';
  playerData: PlayerData = {
    twitterId: '',
    charactors: '',
    rank: 0,
    latestRating: 0,
    bestRating: 0,
    worstRating: 0,
    winRate: 0,
    winN: 0,
    loseN: 0,
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

  ngOnInit(): void {
    this.playerName = this.route.snapshot.paramMap.get('name');

    this.http
      .get('assets/players.tsv', { responseType: 'text' })
      .subscribe((playerTsv) => {
        this.http
          .get('assets/player_data.tsv', { responseType: 'text' })
          .subscribe((playerDataTsv) => {
            this.playerData = this.loadPlayerData(playerTsv, playerDataTsv);
            console.log(this.playerData);

            this.winRateTableData = this.createWinRateTableData(playerDataTsv);
            console.log(this.winRateTableData);
          });
      });

    this.http
      .get('assets/ratings.tsv', { responseType: 'text' })
      .subscribe((ratingsTsv) => {
        this.chartOptions = this.createRatingChartData(ratingsTsv);
        console.log(this.chartOptions);
      });

    this.http
      .get('assets/results.tsv', { responseType: 'text' })
      .subscribe((resultsTsv) => {
        this.battleRecordTableData = this.createBattleRecordData(resultsTsv);
        console.log(this.battleRecordTableData);
      });
  }

  loadPlayerData(playerTsv: string, playerDataTsv: string): PlayerData {
    let playerLines = playerTsv.split('\n');
    playerLines.shift();
    let playerValues: string[] = [];
    for (let line of playerLines) {
      const values = line.split('\t');
      if (values.length == 0) continue;
      if (values[0] == this.playerName) {
        playerValues = values;
        break;
      }
    }
    console.assert(playerValues.length > 0);

    let PlayerDatalines = playerDataTsv.split('\n');
    PlayerDatalines.shift();
    let playerDataValues: string[] = [];
    for (let line of PlayerDatalines) {
      const values = line.split('\t');
      if (values.length == 0) continue;
      if (values[1] == this.playerName) {
        playerDataValues = values;
        break;
      }
    }
    console.assert(playerDataValues.length > 0);

    const data: PlayerData = {
      twitterId: playerValues[6],
      charactors: playerValues[7],
      rank: Math.round(Number(playerDataValues[7])),
      latestRating: Math.round(Number(playerDataValues[3])),
      bestRating: Math.round(Number(playerDataValues[4])),
      worstRating: Math.round(Number(playerDataValues[5])),
      winRate: Math.round(Number(playerDataValues[10]) * 100),
      winN: Math.round(Number(playerDataValues[12])),
      loseN: Math.round(Number(playerDataValues[13])),
    };
    return data;
  }

  createRatingChartData(ratingsTsv: string): ChartOptions {
    let lines = ratingsTsv.split('\n');
    lines.shift();

    let dateToRatings: { [key: string]: number } = {};
    for (let line of lines) {
      const values = line.split('\t');
      if (values.length == 0) continue;
      if (values[3] != this.playerName) continue;

      const date: string = values[2];
      const rating: number = Number(values[4]);

      if (date in dateToRatings) continue;

      dateToRatings[date] = rating;
    }

    return {
      series: [
        {
          name: 'レーティング',
          data: Object.values(dateToRatings).reverse(),
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
      },
      stroke: {
        curve: 'straight',
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
        categories: Object.keys(dateToRatings).reverse(),
      },
    };
  }

  createWinRateTableData(ratingsTsv: string): WinRateRecord[] {
    let lines = ratingsTsv.split('\n');
    lines.shift();

    let winRateRecords: WinRateRecord[] = [];
    for (let line of lines) {
      const values = line.split('\t');
      if (values.length < 2) continue;
      if (values[1] == this.playerName) continue;

      const rating: number = Number(values[3]);

      const winRate = (
        Math.round(
          (1 / (1 + 10 ** ((rating - this.playerData.latestRating) / 400))) *
            1000
        ) / 10
      ).toFixed(1);

      const wrr: WinRateRecord = {
        opponentName: values[1],
        opponentRating: rating,
        rateDiff: this.playerData.latestRating - rating,
        winRate: winRate,
      };
      winRateRecords.push(wrr);
    }

    return winRateRecords;
  }

  createBattleRecordData(resultsTsv: string): BattleRecord[] {
    let lines = resultsTsv.split('\n');
    lines.shift();

    let battleRecords = [];
    for (let line of lines) {
      const values = line.split('\t');
      if (values.length == 0) continue;

      const winner = values[4];
      const loser = values[5];
      if (winner != this.playerName && loser != this.playerName) continue;

      const isWin = this.playerName == winner;

      let winSetN, loseSetN, opponentName;
      if (isWin) {
        winSetN = Number(values[6]);
        loseSetN = Number(values[7]);
        opponentName = loser;
      } else {
        winSetN = Number(values[7]);
        loseSetN = Number(values[6]);
        opponentName = winner;
      }

      const br: BattleRecord = {
        date: values[3],
        SFLStage: Number(values[0]),
        SFLQuarter: Number(values[1]),
        SFLMatch: Number(values[2]),
        isWin: isWin,
        winSetN: winSetN,
        loseSetN: loseSetN,
        opponentName: opponentName,
        // opponentRating?:,
        // ratingDiff?:,
      };
      battleRecords.push(br);
    }

    battleRecords.sort((a, b) => {
      if (a.date < b.date) return 1;
      if (a.date > b.date) return -1;
      return 0;
    });

    return battleRecords;
  }

  openTwitter() {
    const url = `https://twitter.com/${this.playerData.twitterId}`;
    window.open(url, '_blank');
  }

  navigateToPlayerComponent(playerName: string) {
    // this.router.navigate(['/player', playerName]);
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/player', playerName]);
    });
  }

  getWinrateColor(winRate: string) {
    const wrate = Number(winRate);

    if (wrate > 90) return 'color: #550000';
    else if (wrate > 80) return 'color: #880000';
    else if (wrate > 70) return 'color: #AA0000';
    else if (wrate > 60) return 'color: #CC0000';
    else if (wrate > 55) return 'color: #EE0000';
    else if (wrate > 45) return 'color: #00BB00';
    else if (wrate > 40) return 'color: #0000EE';
    else if (wrate > 30) return 'color: #0000CC';
    else if (wrate > 20) return 'color: #0000AA';
    else if (wrate > 10) return 'color: #000088';
    else return 'color: #000055';
  }
}
