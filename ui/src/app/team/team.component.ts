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
  points: number;
  isUpdated: boolean;
}
@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {
  ratingTableData: PlayerRatingElement[] = [];
  displayedColumns: string[] = [
    'crown',
    'rank',
    'name',
    'rating',
    'winRate',
    'points',
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get('assets/team_ratings.tsv', { responseType: 'text' })
      .subscribe((tsvData) => {
        this.ratingTableData = this.loadRatingTableData(tsvData);
        // console.log(this.ratingTableData);
      });
  }

  loadRatingTableData(tsvData: string): PlayerRatingElement[] {
    const lines = tsvData.split('\n');
    const data: PlayerRatingElement[] = [];
    lines.shift();
    for (let line of lines) {
      const values = line.split('\t');
      if (values.length < 2) continue;

      let diffRank = Math.round(Number(values[5])).toString();
      if (Number(diffRank) >= 0) {
        diffRank = '+' + diffRank;
      }

      let diffRating = values[3];
      if (Number(diffRating) >= 0) {
        diffRating = '+' + diffRating;
      }

      const winRate = Math.round((Number(values[8]) / Number(values[7])) * 100);

      data.push({
        rank: Number(values[4]),
        diffRank: diffRank,
        name: values[1],
        rating: Number(values[2]),
        diffRating: diffRating,
        winRate: winRate,
        game_n: Math.round(Number(values[7])),
        win_n: Math.round(Number(values[8])),
        points: Math.round(Number(values[6])),
        isUpdated: values[10] == 'True',
      });
    }
    return data;
  }
}
