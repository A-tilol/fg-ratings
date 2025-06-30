import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AssetLoadService } from './cpt2025/asset-load.service';
import { PlayerCpt25Component } from './cpt2025/player-cpt25/player-cpt25.component';
import { RatingsComponent } from './cpt2025/ratings/ratings.component';
import { HomeComponent } from './home/home.component';
import { PlayerComponent } from './player/player.component';
import { TeamRankingComponent } from './team-ranking/team-ranking.component';
import { TeamComponent } from './team/team.component';

import { NgFor } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgApexchartsModule } from 'ng-apexcharts';

@NgModule({
  declarations: [
    AppComponent,
    PlayerComponent,
    HomeComponent,
    TeamRankingComponent,
    TeamComponent,
    RatingsComponent,
    PlayerCpt25Component,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatSlideToggleModule,
    MatTableModule,
    HttpClientModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    NgApexchartsModule,
    MatMenuModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSortModule,
    NgFor,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => {
          // 翻訳ファイルをロードするためのファクトリ関数を定義
          return new TranslateHttpLoader(http, './assets/i18n/', '.json');
        },
        deps: [HttpClient],
      },
      // 他の言語が設定されていない場合や、翻訳キーが見つからない場合のフォールバックとしても機能
      defaultLanguage: 'en',
    }),
  ],
  providers: [AssetLoadService],
  bootstrap: [AppComponent],
})
export class AppModule {}
