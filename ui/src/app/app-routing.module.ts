import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RatingsComponent } from './cpt2025/ratings/ratings.component';
import { HomeComponent } from './home/home.component';
import { PlayerComponent } from './player/player.component';
import { TeamComponent } from './team/team.component';

const routes: Routes = [
  { path: '', component: RatingsComponent },
  { path: 'home', component: HomeComponent },
  { path: 'team', component: TeamComponent },
  { path: 'player/:name', component: PlayerComponent },
  { path: 'cpt2025/ratings', component: RatingsComponent },
  { path: '**', component: HomeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
