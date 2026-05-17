// main-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';   // ← Added for Back Button

export interface Feature {
  id: string;
  name: string;
  path: string;
  desc: string;
  longDesc: string;
  icon: string;
  color: string;
  stats: { key: string; value: string }[];
}

export interface NavTab {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────────────────────────────
  isScanning    = false;
  scanProgress  = 0;
  scanStep      = 'Initializing…';
  activeTab     = 'home';
  healthPercent = 85;

  private scanTimer: any;

  private scanSteps = [
    'Connecting to vehicle…',
    'Reading battery data…',
    'Checking fluid lines…',
    'Analyzing exhaust smoke…',
    'Scanning body for rust…',
    'Inspecting tire condition…',
    'Compiling results…',
    'Scan complete ✓',
  ];

  get healthLabel(): string {
    if (this.healthPercent >= 80) return 'GOOD';
    if (this.healthPercent >= 50) return 'FAIR';
    return 'CRITICAL';
  }

  // ── Radar Dots ────────────────────────────────────────────────────────────
  radarDots = Array.from({ length: 5 }, () => ({
    x: `${20 + Math.random() * 60}%`,
    y: `${20 + Math.random() * 60}%`,
  }));

  // ── Features ──────────────────────────────────────────────────────────────
  features: Feature[] = [
    { id: 'battery', name: 'Battery', path: '/battery', desc: 'Voltage & charging health', longDesc: 'Measures cold cranking amps, state of charge, and internal resistance.', icon: '🔋', color: '#22d37a', stats: [{ key: 'Voltage', value: '12.6V' }, { key: 'Health', value: '91%' }] },
    { id: 'leak', name: 'Fluid Leak', path: '/fluid-leak', desc: 'Detect leaks under the car', longDesc: 'AI vision scans beneath your vehicle...', icon: '💧', color: '#2E8BFF', stats: [{ key: 'Oil', value: 'OK' }] },
    { id: 'smoke', name: 'Smoke', path: '/smoke', desc: 'Exhaust smoke analysis', longDesc: 'Analyzes exhaust smoke...', icon: '💨', color: '#a78bfa', stats: [{ key: 'CO Level', value: 'Normal' }] },
    { id: 'rust', name: 'Rust', path: '/rust', desc: 'Body corrosion detection', longDesc: 'Scans your vehicle body...', icon: '🛡️', color: '#f97316', stats: [{ key: 'Risk Level', value: 'Low' }] },
    { id: 'tire', name: 'Tires', path: '/tire', desc: 'Pressure, wear & alignment', longDesc: 'Full tire health...', icon: '⚫', color: '#00D4FF', stats: [{ key: 'Pressure', value: '32 PSI' }] },
  ];

  // ── Nav Tabs ──────────────────────────────────────────────────────────────
  navTabs: NavTab[] = [ /* ... same as before */ ];

  constructor(
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {}
  ngOnDestroy(): void { this.stopScan(); }

  setTab(id: string): void { this.activeTab = id; }

  openFeature(f: Feature): void {
    this.router.navigate([f.path]);
  }

  runFeatureScan(f: Feature): void {
    this.router.navigate([f.path]);
  }

  goBack(): void {
    this.location.back();
  }

  runFullScan(): void { /* same as before */ }
  cancelScan(): void { /* same */ }
  private stopScan(): void { /* same */ }
  onCarImgError(e: Event): void { /* same */ }

  trackById(index: number, feature: Feature): string {
    return feature.id;
  }
}