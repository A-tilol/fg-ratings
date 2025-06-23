import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCpt25Component } from './player-cpt25.component';

describe('PlayerCpt25Component', () => {
  let component: PlayerCpt25Component;
  let fixture: ComponentFixture<PlayerCpt25Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlayerCpt25Component]
    });
    fixture = TestBed.createComponent(PlayerCpt25Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
