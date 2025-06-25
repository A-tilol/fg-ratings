import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Match, Placement, Player, Ratings } from './interfaces';

@Injectable({
  providedIn: 'root',
})
export class AssetLoadService {
  constructor(private http: HttpClient) {}

  public loadAssetTsvToJson(filePath: string): Observable<any[]> {
    return this.http.get(filePath, { responseType: 'text' }).pipe(
      map((tsvData: string) => {
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

  public loadCpt2025Matches(playerId: string): Observable<Match[]> {
    const filePath = 'assets/cpt_2025/all_matches.tsv';
    return this.loadAssetTsvToJson(filePath).pipe(
      map((matches) => {
        const data: Match[] = [];
        for (const match of matches) {
          if (match.Player1 !== playerId && match.Player2 !== playerId)
            continue;

          data.push({
            Datetime: match['Datetime(UTC)']
              .replace(' UTC', 'Z')
              .replace(' ', 'T'),
            Event: match.Event,
            Bracket: match.Bracket,
            Round: match.Round,
            Player1: match.Player1,
            Player2: match.Player2,
            Player1Score: match.Player1Score,
            Player2Score: match.Player2Score,
            Player1Chars: match.Player1Chars,
            Player2Chars: match.Player2Chars,
            RateDiff: Number(match.RateDiff),
          });
        }
        return data;
      })
    );
  }
}
