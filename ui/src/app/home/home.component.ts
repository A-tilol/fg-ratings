import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

export interface PlayerRatingElement {
  rank: number;
  name: string;
  rating: number;
  winRate: string;
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
      if (values.length != 12) continue;

      data.push({
        rank: Number(values[6]),
        name: values[1],
        rating: Number(values[3]),
        winRate: `${Math.round(Number(values[8]) * 100)}% (${Math.round(Number(values[10]))}/${Math.round(Number(values[9]))})`,
      });
    }
    return data;
  }
}
