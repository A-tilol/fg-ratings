import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, map } from 'rxjs';
import * as _utils from '../../utils';

export interface PlayerRatingElement {
  rank: number;
  diffRank: string;
  name: string;
  countryCode: string;
  rating: number;
  diffRating: string;
  winRate: number;
  game_n: number;
  win_n: number;
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

@Component({
  selector: 'app-ratings',
  templateUrl: './ratings.component.html',
  styleUrls: ['./ratings.component.scss'],
})
export class RatingsComponent {
  utils = _utils;
  ratingTableData: MatTableDataSource<PlayerRatingElement> =
    new MatTableDataSource<PlayerRatingElement>([]);
  displayedColumns: string[] = ['rank', 'country', 'name', 'rating', 'winRate'];
  idToRating: { [key: string]: Ratings } = {};
  idToPlayer: { [key: string]: Player } = {};

  constructor(private http: HttpClient) {}

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    forkJoin({
      ratings: this.loadCpt2025Ratings(),
      players: this.loadCpt2025Players(),
    }).subscribe({
      next: ({ ratings, players }) => {
        this.idToRating = ratings;
        this.idToPlayer = players;

        this.ratingTableData = new MatTableDataSource<PlayerRatingElement>(
          this.createTableData()
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

  private createTableData(): PlayerRatingElement[] {
    const data: PlayerRatingElement[] = [];
    for (let playerId of Object.keys(this.idToRating)) {
      const rating = this.idToRating[playerId];
      const player = this.idToPlayer[playerId];

      data.push({
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
        isUpdated: false,
      });
    }
    data.sort((a, b) => a.rank - b.rank);
    return data;
  }

  public getFlagClasses(countryCode: string) {
    if (Boolean(countryCode)) {
      return ['flag-icon', `flag-icon-${countryCode}`];
    }
    return [];
  }
}
