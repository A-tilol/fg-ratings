import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public router: Router) {}

  shareWithTwitter() {
    window.open(
      'https://twitter.com/intent/tweet?text=格ゲーマーレーティング&url=https://a-tilol.github.io/fg-ratings/',
      '_blank'
    );
  }
}
