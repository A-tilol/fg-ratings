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
  charactors: string[]
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
    charactors: [],
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
          data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
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
        categories: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep"
        ]
      }
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
  }

  loadPlayerData(playerTsv: string, playerDataTsv: string): PlayerData {
    let playerLines = playerTsv.split('\n');
    playerLines.shift();
    let playerValues: string[] = [];
    for (let line of playerLines) {
      const values = line.split('\t');
      console.log(values)
      if (values.length != 2) continue;
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
      if (values.length != 14) continue;
      if (values[1] == this.playerName) {
        playerDataValues = values
        break
      }
    }
    console.log(playerDataValues)
    console.assert(playerDataValues.length > 0)

    const data: PlayerData = {
      twitterId: playerValues[1],
      charactors: playerValues[1].split(","),
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
}
