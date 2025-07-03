import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs'; // ofをインポート (エラー時にObservableを返すため)
import { catchError } from 'rxjs/operators'; // catchErrorをインポート
import { config } from './config'; // config.tsからURLをインポート

@Injectable({
  providedIn: 'root',
})
export class SlackNotifierService {
  constructor(private http: HttpClient) {}

  /**
   * pipedream経由でSlackに通知
   * （CORS制約を回避するため）
   */
  notifyAccess(): void {
    const message = {
      text: `${window.location} にアクセスがありました！!`,
    };

    this.http
      .post(config.pipedreamEndpointForSlackNortification, message)
      .pipe(
        catchError((error) => {
          console.error('Error sending Slack notification:', error);
          return of(null);
        })
      )
      .subscribe();
  }
}
