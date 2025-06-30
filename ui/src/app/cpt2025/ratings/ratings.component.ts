import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';

import * as _ from 'lodash';
import * as _utils from '../../utils';
import { AssetLoadService } from '../asset-load.service';
import { Placement, Player, Ratings } from '../interfaces';

export interface PlayerRatingElement {
  playerId: string;
  rank: number;
  diffRank: string;
  name: string;
  countryCode: string;
  rating: number;
  diffRating: string;
  winRate: number;
  game_n: number;
  win_n: number;
  cptPoint: number;
  tournamentWinCnt: number;
  isUpdated: boolean;
}

@Component({
  selector: 'app-ratings',
  templateUrl: './ratings.component.html',
  styleUrls: ['./ratings.component.scss'],
})
export class RatingsComponent implements AfterViewInit {
  private tableDataSource: PlayerRatingElement[] = [];

  utils = _utils;

  events: string[] = [];
  ratingTableData: MatTableDataSource<PlayerRatingElement> =
    new MatTableDataSource<PlayerRatingElement>([]);
  displayedColumns: string[] = [
    'rank',
    'country',
    'name',
    'rating',
    'winRate',
    'cptPoint',
  ];

  countries: string[] = [];
  selectedCountry = 'All';

  minRating = 0;
  maxRating = 0;

  constructor(private assetLoadService: AssetLoadService) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    forkJoin({
      idToRating: this.assetLoadService.loadCpt2025Ratings(),
      idToPlayer: this.assetLoadService.loadCpt2025Players(),
      placements: this.assetLoadService.loadCpt2025Placements(),
    }).subscribe({
      next: ({ idToRating, idToPlayer, placements }) => {
        this.events = this.getEventList(placements);

        this.tableDataSource = this.createTableData(
          idToRating,
          idToPlayer,
          placements
        );

        this.countries = this.createCountryList(this.tableDataSource);

        this.ratingTableData.data = this.filterTableData();

        this.minRating = this.ratingTableData.data.at(-1)!.rating;
        this.maxRating = this.ratingTableData.data.at(0)!.rating;
      },
      error: (error) => {
        console.error('データロード中にエラーが発生しました:', error);
      },
      complete: () => {
        console.log('forkJoin購読完了');
      },
    });
  }

  ngAfterViewInit(): void {
    this.ratingTableData.paginator = this.paginator;
    this.ratingTableData.sort = this.sort;
  }

  getEventList(placements: Placement[]): string[] {
    const events: Set<string> = new Set();
    for (const placement of placements) {
      events.add(placement.event);
    }
    return [...events];
  }

  private createCountryList(players: PlayerRatingElement[]): string[] {
    const countryToCnt: { [key: string]: number } = {};
    for (const player of players) {
      if (player.countryCode === '') continue;
      if (player.countryCode in countryToCnt) {
        countryToCnt[player.countryCode] += 1;
      } else {
        countryToCnt[player.countryCode] = 1;
      }
    }

    const countries = Object.entries(countryToCnt)
      .sort((a, b) => b[1] - a[1])
      .map((v) => v[0].toUpperCase());
    countries.unshift('All');
    return countries;
  }

  private filterTableData(): PlayerRatingElement[] {
    const ccode = this.selectedCountry.toLowerCase();

    let filtered = this.tableDataSource.filter((player) => {
      if (ccode == 'all') return true;
      return player.countryCode === ccode;
    });

    filtered = _.cloneDeep(filtered);

    filtered.forEach((player, i) => {
      player.rank = i + 1;
    });

    return filtered;
  }

  changeCountry(event: MatSelectChange) {
    this.selectedCountry = event.value;
    this.ratingTableData.data = this.filterTableData();
  }

  private createTableData(
    idToRating: { [key: string]: Ratings },
    idToPlayer: { [key: string]: Player },
    placements: Placement[]
  ): PlayerRatingElement[] {
    // 優勝回数とCPTポイントをプレイヤーごとに集計
    const tournamentWinCnt: { [key: string]: number } = {};
    const idToCptPoint: { [key: string]: number } = {};
    for (const placement of placements) {
      if (placement.placement === 1) {
        if (placement.playerId in tournamentWinCnt) {
          tournamentWinCnt[placement.playerId] += 1;
        } else {
          tournamentWinCnt[placement.playerId] = 1;
        }
      }

      if (placement.playerId in idToCptPoint) {
        idToCptPoint[placement.playerId] += placement.cptPoint;
      } else {
        idToCptPoint[placement.playerId] = placement.cptPoint;
      }
    }

    const data: PlayerRatingElement[] = [];
    for (let playerId of Object.keys(idToRating)) {
      const rating = idToRating[playerId];
      const player = idToPlayer[playerId];

      data.push({
        playerId: playerId,
        rank: rating.rank,
        diffRank: '0',
        name: player.gamerTag,
        countryCode: player.countryCode,
        rating: rating.rating,
        diffRating: '0',
        winRate: Math.round(
          (rating.winCnt / (rating.winCnt + rating.loseCnt)) * 100
        ),
        game_n: rating.winCnt + rating.loseCnt,
        win_n: rating.winCnt,
        cptPoint: idToCptPoint[playerId],
        tournamentWinCnt:
          playerId in tournamentWinCnt ? tournamentWinCnt[playerId] : 0,
        isUpdated: false,
      });
    }
    data.sort((a, b) => a.rank - b.rank);
    return data;
  }

  public getFlagClasses(countryCode: string) {
    if (Boolean(countryCode)) {
      return ['flag-icon', `flag-icon-${countryCode.toLocaleLowerCase()}`];
    }
    return [];
  }

  getColorForRating(rating: number): string {
    // レートを0から1の範囲に正規化
    const normalizedRating =
      (rating - this.minRating) / (this.maxRating - this.minRating);

    // 最高レート（maxRating）を赤（5R, HSLのH=0）とする
    const maxHue = 0; // 赤

    // 0レートを緑（H=120）あたりに設定すると、赤→黄→緑のグラデーションになる
    const minHue = 150; // 緑（赤から右回り120度）

    // 正規化されたレートに基づいて色相（Hue）を線形補間
    const hue = minHue - normalizedRating * (minHue - maxHue);

    // 彩度（Saturation）と輝度（Lightness）は固定で設定
    const saturation = 50 + 30 * normalizedRating * normalizedRating; // %
    const lightness = 50; // %

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}
