import { TestBed } from '@angular/core/testing';

import { AssetLoadService } from './asset-load.service';

describe('AssetLoadService', () => {
  let service: AssetLoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetLoadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
