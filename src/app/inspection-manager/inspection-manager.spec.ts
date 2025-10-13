import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectionManager } from './inspection-manager';

describe('InspectionManager', () => {
  let component: InspectionManager;
  let fixture: ComponentFixture<InspectionManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectionManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InspectionManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
