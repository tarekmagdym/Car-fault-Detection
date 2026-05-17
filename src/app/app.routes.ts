import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { BatteryComponent } from './pages/battery/battery.component';
import { SmokeComponent } from './pages/smoke/smoke.component';
import { RustComponent } from './pages/rust/rust.component';
import { TireComponent } from './pages/tires/tires.component';

export const routes: Routes = [

  // Default Route
  {
    path: '',
    component: HomeComponent
  },

  // Home Route
  {
    path: 'home',
    component: HomeComponent
  },

  // Main Page Route
  {
    path: 'main-page',
    component: MainPageComponent
  },
  {
    path: 'battery',
    component: BatteryComponent
  },
  {
    path: 'smoke',
    component: SmokeComponent
  },
  {
    path: 'rust',
    component: RustComponent
  },
  {
    path: 'tire',
    component: TireComponent
  },

  // If route not found
  {
    path: '**',
    redirectTo: ''
  }

];
