import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public router: Router, public translate: TranslateService) {
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
