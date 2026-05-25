import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportesDashboard } from './reportes-dashboard';

describe('ReportesDashboard', () => {
  let component: ReportesDashboard;
  let fixture: ComponentFixture<ReportesDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportesDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportesDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
