import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CptHomeComponent } from './cpt-home.component';

describe('CptHomeComponent', () => {
  let component: CptHomeComponent;
  let fixture: ComponentFixture<CptHomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CptHomeComponent]
    });
    fixture = TestBed.createComponent(CptHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
