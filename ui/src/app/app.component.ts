import { Component, OnInit } from '@angular/core'; // OnInitをインポート
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SlackNotifierService } from './slack-notifier.service'; // SlackNotifierServiceをインポート

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(
    public router: Router,
    public translate: TranslateService,
    private slackNotifierService: SlackNotifierService // SlackNotifierServiceをDI
  ) {
    this.translate.addLangs(['en', 'ja']); // アプリケーションでサポートする言語
    this.translate.setDefaultLang('en'); // デフォルト言語を設定

    // サポートされている言語の場合のみ、その言語を使用
    const browserLang = this.translate.getBrowserLang();
    this.translate.use(
      browserLang && this.translate.langs.includes(browserLang)
        ? browserLang
        : 'en'
    );
  }

  ngOnInit(): void {
    this.slackNotifierService.notifyAccess();
  }

  changeLanguage(lang: string) {
    this.translate.use(lang);
  }

  shareWithTwitter() {
    window.open(
      'https://twitter.com/intent/tweet?text=格ゲーマーレーティング&url=https://a-tilol.github.io/fg-ratings/',
      '_blank'
    );
  }
}
