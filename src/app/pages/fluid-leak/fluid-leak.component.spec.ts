import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FluidLeakComponent } from './fluid-leak.component';

describe('FluidLeakComponent', () => {
  let component: FluidLeakComponent;
  let fixture: ComponentFixture<FluidLeakComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FluidLeakComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FluidLeakComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
