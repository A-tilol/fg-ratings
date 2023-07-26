import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

export interface PlayerRatingElement {
  rank: number;
  diffRank: string;
  name: string;
  rating: number;
  diffRating: string;
  winRate: number;
  game_n: number;
  win_n: number;
  isUpdated: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  ratingTableData: PlayerRatingElement[] = [];
  displayedColumns: string[] = ['crown', 'rank', 'name', 'rating', 'winRate'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get('assets/player_data.tsv', { responseType: 'text' })
      .subscribe((tsvData) => {
        this.ratingTableData = this.loadRatingTableData(tsvData);
        console.log(this.ratingTableData);
      });
  }

  loadRatingTableData(tsvData: string): PlayerRatingElement[] {
    const lines = tsvData.split('\n');
    const data: PlayerRatingElement[] = [];
    lines.shift();
    for (let line of lines) {
      const values = line.split('\t');
      if (values.length != 14) continue;

      let diffRank = Math.round(Number(values[8])).toString();
      if (Number(diffRank) >= 0) {
        diffRank = '+' + diffRank;
      }

      let diffRating = values[6];
      if (Number(diffRating) >= 0) {
        diffRating = '+' + diffRating;
      }

      data.push({
        rank: Number(values[7]),
        diffRank: diffRank,
        name: values[1],
        rating: Number(values[3]),
        diffRating: diffRating,
        winRate: Math.round(Number(values[10]) * 100),
        game_n: Math.round(Number(values[11])),
        win_n: Math.round(Number(values[12])),
        isUpdated: values[9] == 'True',
      });
    }
    return data;
  }
}
