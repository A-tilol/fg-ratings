import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css'],
})
export class PlayerComponent implements OnInit {
  playerName: string | null = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // // ルートパラメータからプレイヤー名を取得
    // this.route.params.subscribe((params) => {
    //   this.playerName = params['name'];
    //   this.loadPlayerData(this.playerName);
    // });
    this.playerName = this.route.snapshot.paramMap.get('name');
  }

  loadPlayerData(name: string): any {
    return [];
  }
}
