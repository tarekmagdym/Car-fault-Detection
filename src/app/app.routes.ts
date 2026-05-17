import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { MainPageComponent } from './pages/main-page/main-page.component';

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

  // If route not found
  {
    path: '**',
    redirectTo: ''
  }

];
