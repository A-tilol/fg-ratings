import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid
} from "ng-apexcharts";

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
  twitterId: string
  charactors: string
  rank: number
  latestRating: number
  bestRating: number
  worstRating: number
  winRate: number
  winN: number
  loseN: number
}

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: ChartOptions;

  playerName: string | null = '';
  playerData: PlayerData = {
    twitterId: "",
    charactors: "",
    rank: 0,
    latestRating: 0,
    bestRating: 0,
    worstRating: 0,
    winRate: 0,
    winN: 0,
    loseN: 0,
  };

  constructor(private route: ActivatedRoute, private http: HttpClient) {
    this.chartOptions = {
      series: [
        {
          name: "レーティング",
          data: [1],
        }],
      chart: {
        type: "line",
      },
      dataLabels: {},
      stroke: {},
      title: {},
      grid: {},
      xaxis: {}
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
          });
      });

    this.http
      .get('assets/ratings.tsv', { responseType: 'text' })
      .subscribe((ratingsTsv) => {
        this.createRatingChartData(ratingsTsv);
      });
  }

  loadPlayerData(playerTsv: string, playerDataTsv: string): PlayerData {
    let playerLines = playerTsv.split('\n');
    playerLines.shift();
    let playerValues: string[] = [];
    for (let line of playerLines) {
      const values = line.split('\t');
      console.log(values)
      if (values.length == 0) continue;
      if (values[0] == this.playerName) {
        playerValues = values
        break
      }
    }
    console.log(playerValues)
    console.assert(playerValues.length > 0)

    let PlayerDatalines = playerDataTsv.split('\n');
    PlayerDatalines.shift();
    let playerDataValues: string[] = []
    for (let line of PlayerDatalines) {
      const values = line.split('\t');
      console.log(values)
      if (values.length == 0) continue;
      if (values[1] == this.playerName) {
        playerDataValues = values
        break
      }
    }
    console.log(playerDataValues)
    console.assert(playerDataValues.length > 0)

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
    }
    return data;
  }

  createRatingChartData(ratingsTsv: string) {
    let lines = ratingsTsv.split('\n');
    lines.shift();

    let dateToRatings: { [key: string]: number } = {}
    for (let line of lines) {
      const values = line.split('\t');
      console.log(values)
      if (values.length == 0) continue;
      if (values[3] != this.playerName) continue

      const date: string = values[2]
      const rating: number = Number(values[4])

      if (date in dateToRatings) continue

      dateToRatings[date] = rating
    }

    this.chartOptions = {
      series: [
        {
          name: "レーティング",
          data: Object.values(dateToRatings).reverse(),
        }
      ],
      chart: {
        height: 350,
        type: "line",
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: true
      },
      stroke: {
        curve: "straight"
      },
      title: {
        text: "レーティング推移",
        align: "left"
      },
      grid: {
        row: {
          colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
          opacity: 0.5
        }
      },
      xaxis: {
        categories: Object.keys(dateToRatings).reverse()
      }
    };
  }

  openTwitter() {
    const url = `https://twitter.com/${this.playerData.twitterId}`
    window.open(url, "_blank")
  }
}
