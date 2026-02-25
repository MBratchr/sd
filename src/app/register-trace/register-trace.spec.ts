import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterTrace } from './register-trace';

describe('RegisterTrace', () => {
  let component: RegisterTrace;
  let fixture: ComponentFixture<RegisterTrace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterTrace]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterTrace);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
