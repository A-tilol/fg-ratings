import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, map } from 'rxjs';

import * as _ from 'lodash';
import * as _utils from '../../utils';

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

export interface Ratings {
  rank: number;
  rating: number;
  winCnt: number;
  loseCnt: number;
}

export interface Player {
  gamerTag: string;
  countryCode: string;
  birthday: string;
}

export interface Placement {
  placement: number;
  cptPoint: number;
  playerId: string;
  event: string;
}

@Component({
  selector: 'app-ratings',
  templateUrl: './ratings.component.html',
  styleUrls: ['./ratings.component.scss'],
})
export class RatingsComponent {
  private tableDataSource: PlayerRatingElement[] = [];

  utils = _utils;
  ratingTableData: MatTableDataSource<PlayerRatingElement> =
    new MatTableDataSource<PlayerRatingElement>([]);
  displayedColumns: string[] = [
    'rank',
    'country',
    'name',
    'rating',
    'winRate',
    'CPTPoint',
  ];

  countries: string[] = [];
  selectedCountry = 'All';

  constructor(private http: HttpClient) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    forkJoin({
      idToRating: this.loadCpt2025Ratings(),
      idToPlayer: this.loadCpt2025Players(),
      placements: this.loadCpt2025Placements(),
    }).subscribe({
      next: ({ idToRating, idToPlayer, placements }) => {
        this.tableDataSource = this.createTableData(
          idToRating,
          idToPlayer,
          placements
        );
        this.countries = this.createCountryList(this.tableDataSource);
        this.ratingTableData = new MatTableDataSource<PlayerRatingElement>(
          this.filterTableData()
        );
        this.ratingTableData.paginator = this.paginator;
      },
      error: (error) => {
        console.error('データロード中にエラーが発生しました:', error);
      },
      complete: () => {
        console.log('forkJoin購読完了');
      },
    });
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
}
