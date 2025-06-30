import { Location } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';

import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
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
import { forkJoin, Subject, takeUntil } from 'rxjs';
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
  prizeMoney: number;
}

export interface BattleRecord {
  year: string;
  date: string;
  event: string;
  bracket: string;
  round: string;
  isWin: boolean;
  winSetN: string;
  loseSetN: string;
  playerTag: string;
  opponenTag: string;
  opponenId: string;
  rating: number;
  ratingDiff: number;
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
    prizeMoney: 0,
  };

  battleRecordTableData: MatTableDataSource<BattleRecord> =
    new MatTableDataSource<BattleRecord>([]);
  displayedColumns: string[] = [
    'date',
    'event',
    // 'round',
    'score',
    'opponent',
    'rating',
  ];

  winRateTableData: WinRateRecord[] = [];
  winRateTableColumns: string[] = [
    'opponentName',
    'opponentRating',
    'rateDiff',
    'winRate',
  ];

  private idToPlayer: { [key: string]: Player } = {};
  private matches: Match[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private assetLoadService: AssetLoadService,
    private translate: TranslateService
  ) {
    this.chartOptions = {
      series: [
        {
          name: this.translate.instant('PLAYER_CPT25.CHART.SERIES_NAME_RATING'),
          data: [0],
        },
      ],
      chart: {
        type: 'line',
      },
      dataLabels: {},
      stroke: {},
      title: {
        text: this.translate.instant(
          'PLAYER_CPT25.CHART.TITLE_RATING_TRANSITION'
        ),
      },
      grid: {},
      xaxis: {},
      tooltip: {},
    };
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    // 戻るボタン使用時にコンポーネントが再描画されるようURLパラメータ変化を購読
    this.route.paramMap
      .pipe(takeUntil(this.destroy$)) // コンポーネント破棄時に購読を自動解除
      .subscribe(() => {
        this.playerId = this.route.snapshot.paramMap.get('id');
        if (this.playerId === null) {
          console.error('playerIdが取得できませんでした。');
          return;
        }

        // データ取得
        forkJoin({
          idToRating: this.assetLoadService.loadCpt2025Ratings(),
          idToPlayer: this.assetLoadService.loadCpt2025Players(),
          placements: this.assetLoadService.loadCpt2025Placements(),
          matches: this.assetLoadService.loadCpt2025Matches(this.playerId),
          additionalData: this.assetLoadService.loadAssetAdditionalJson(),
        }).subscribe({
          next: ({
            idToRating,
            idToPlayer,
            placements,
            matches,
            additionalData,
          }) => {
            this.idToPlayer = idToPlayer;
            this.matches = matches;

            this.playerData = this.createPlayerData(
              idToRating,
              idToPlayer,
              placements,
              matches,
              additionalData
            );
            this.updateChartOptions();
            this.battleRecordTableData = new MatTableDataSource(
              this.createBattleRecordData(matches, idToPlayer)
            );
            this.battleRecordTableData.paginator = this.paginator;
          },
          error: (error) => {
            console.error('データロード中にエラーが発生しました:', error);
          },
          complete: () => {
            console.log('forkJoin購読完了');
          },
        });

        // 言語変更を購読
        this.translate.onLangChange
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.updateChartOptions();
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createPlayerData(
    idToRating: { [key: string]: Ratings },
    idToPlayer: { [key: string]: Player },
    placements: Placement[],
    matches: Match[],
    additionalData: any
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

    // 獲得賞金を計算
    const prize = additionalData.eventPrize;
    let prizeMoney = 0;
    for (const result of results) {
      if (result.event in prize && result.placement in prize[result.event]) {
        prizeMoney += prize[result.event][result.placement];
      }
    }
    console.log({ prizeMoney });

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
      prizeMoney: prizeMoney,
    };

    return data;
  }

  updateChartOptions(): void {
    this.chartOptions = this.createRatingChartData(
      this.matches,
      this.idToPlayer
    );
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
          name: this.translate.instant('PLAYER_CPT25.CHART.SERIES_NAME_RATING'),
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
        text: this.translate.instant(
          'PLAYER_CPT25.CHART.TITLE_RATING_TRANSITION'
        ),
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
            return (
              this.translate.instant(
                'PLAYER_CPT25.CHART.TOOLTIP_MATCH_COUNT_PREFIX'
              ) +
              val +
              this.translate.instant(
                'PLAYER_CPT25.CHART.TOOLTIP_MATCH_COUNT_SUFFIX'
              )
            );
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
              }<br>` +
              `${match.Player1Score} - ${match.Player2Score}`
            );
          },
          title: {
            formatter: (series) => {
              return '';
            },
          },
        },
      },
    };
  }

  createBattleRecordData(
    matches: Match[],
    idToPlayer: { [key: string]: Player }
  ): BattleRecord[] {
    if (this.playerId === null) return [];

    matches.sort(
      (a, b) => new Date(a.Datetime).getTime() - new Date(b.Datetime).getTime()
    );

    let currentRating = 1500;
    const data: BattleRecord[] = [];
    for (const match of matches) {
      const ratingDiff =
        match.Player1 === this.playerId ? match.RateDiff : -match.RateDiff;
      currentRating += ratingDiff;
      let winSet =
        match.Player1 === this.playerId
          ? match.Player1Score
          : match.Player2Score;
      let loseSet =
        match.Player1 === this.playerId
          ? match.Player2Score
          : match.Player1Score;
      if (isNaN(Number(winSet))) winSet = 'W';
      if (isNaN(Number(loseSet))) loseSet = 'L';

      data.push({
        year: match.Datetime.slice(0, 4),
        date: match.Datetime.slice(5, 10).replace('-', '/'),
        event: match.Event,
        bracket: match.Bracket,
        round: match.Round,
        isWin: match.Player1 === this.playerId,
        winSetN: winSet,
        loseSetN: loseSet,
        playerTag: idToPlayer[this.playerId].gamerTag,
        opponenTag:
          idToPlayer[
            match.Player1 === this.playerId ? match.Player2 : match.Player1
          ].gamerTag,
        opponenId:
          match.Player1 === this.playerId ? match.Player2 : match.Player1,
        rating: currentRating,
        ratingDiff: Math.abs(ratingDiff),
      });
    }

    return data.reverse();
  }

  navigateToPlayerComponent(playerId: string) {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['cpt2025/player/', playerId]);
    });
  }

  goBack() {
    this.location.back();
  }

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
