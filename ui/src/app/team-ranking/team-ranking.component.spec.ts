import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamRankingComponent } from './team-ranking.component';

describe('TeamRankingComponent', () => {
  let component: TeamRankingComponent;
  let fixture: ComponentFixture<TeamRankingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeamRankingComponent]
    });
    fixture = TestBed.createComponent(TeamRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
