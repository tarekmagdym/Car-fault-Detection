import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiresComponent } from './tires.component';

describe('TiresComponent', () => {
  let component: TiresComponent;
  let fixture: ComponentFixture<TiresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiresComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TiresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
