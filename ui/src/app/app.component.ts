import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

export interface PlayerRatingElement {
  rank: number;
  name: string;
  rating: number;
  winRate: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'ui';

  ratingTableData: PlayerRatingElement[] = [];
  displayedColumns: string[] = ['crown', 'rank', 'name', 'rating', 'winRate'];

  constructor(private http: HttpClient, private router: Router) {}

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
      if (values.length != 12) continue;

      data.push({
        rank: Number(values[6]),
        name: values[1],
        rating: Number(values[3]),
        winRate: `${Math.round(Number(values[8]) * 100)} %`,
      });
    }
    return data;
  }
}
