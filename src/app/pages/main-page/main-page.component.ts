// main-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Feature {
  id: string;
  name: string;
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
  activeFeature: Feature | null = null;
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

  // ── Features — order matters for template node references ─────────────────
  // Index: 0=Battery, 1=Leak, 2=Smoke, 3=Rust, 4=Tire
  features: Feature[] = [
    {
      id: 'battery',
      name: 'Battery',
      desc: 'Voltage & charging health',
      longDesc: 'Measures cold cranking amps, state of charge, and internal resistance. Also checks alternator output and charging system voltage.',
      icon: '🔋',
      color: '#22d37a',
      stats: [
        { key: 'Voltage', value: '12.6V' },
        { key: 'Health',  value: '91%'   },
        { key: 'CCA',     value: '540A'  },
      ],
    },
    {
      id: 'leak',
      name: 'Fluid Leak',
      desc: 'Detect leaks under the car',
      longDesc: 'AI vision scans beneath your vehicle to detect and identify fluid leaks — oil, coolant, brake fluid, transmission fluid — by color and location.',
      icon: '💧',
      color: '#2E8BFF',
      stats: [
        { key: 'Oil',         value: 'OK'  },
        { key: 'Coolant',     value: 'Low' },
        { key: 'Brake Fluid', value: 'OK'  },
      ],
    },
    {
      id: 'smoke',
      name: 'Smoke',
      desc: 'Exhaust smoke analysis',
      longDesc: 'Analyzes exhaust smoke color, density, and chemical composition to identify combustion problems, coolant leaks, or oil burning.',
      icon: '💨',
      color: '#a78bfa',
      stats: [
        { key: 'CO Level',    value: 'Normal' },
        { key: 'Smoke Color', value: 'Clear'  },
        { key: 'Emission',    value: 'Pass'   },
      ],
    },
    {
      id: 'rust',
      name: 'Rust',
      desc: 'Body corrosion detection',
      longDesc: 'Scans your vehicle body using visual pattern recognition to identify surface corrosion, undercoating issues, and paint degradation.',
      icon: '🛡️',
      color: '#f97316',
      stats: [
        { key: 'Last Scan',    value: '2d ago' },
        { key: 'Issues Found', value: '0'      },
        { key: 'Risk Level',   value: 'Low'    },
      ],
    },
    {
      id: 'tire',
      name: 'Tires',
      desc: 'Pressure, wear & alignment',
      longDesc: 'Full tire health: tread depth, pressure monitoring, wear pattern analysis, and sidewall inspection to maximize safety and longevity.',
      icon: '⚫',
      color: '#00D4FF',
      stats: [
        { key: 'Pressure',    value: '32 PSI' },
        { key: 'Tread Depth', value: '7mm'    },
        { key: 'Alignment',   value: 'OK'     },
      ],
    },
  ];

  // ── Nav Tabs ──────────────────────────────────────────────────────────────
  navTabs: NavTab[] = [
    {
      id: 'home',
      label: 'Home',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.8"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.8"/></svg>',
    },
    {
      id: 'history',
      label: 'History',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><polyline points="12 7 12 12 15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.8"/><line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.8"/></svg>',
    },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {}
  ngOnDestroy(): void { this.stopScan(); }

  // ── Methods ───────────────────────────────────────────────────────────────
  setTab(id: string): void { this.activeTab = id; }

  openFeature(f: Feature): void  { this.activeFeature = f; }
  closeFeature(): void           { this.activeFeature = null; }

  runFeatureScan(f: Feature): void {
    this.activeFeature = null;
    setTimeout(() => this.runFullScan(), 150);
  }

  runFullScan(): void {
    if (this.isScanning) return;
    this.isScanning   = true;
    this.scanProgress = 0;
    this.scanStep     = this.scanSteps[0];
    let step = 0;

    this.scanTimer = setInterval(() => {
      this.scanProgress += Math.random() * 12 + 3;
      if (this.scanProgress >= 100) {
        this.scanProgress = 100;
        this.scanStep = this.scanSteps[this.scanSteps.length - 1];
        clearInterval(this.scanTimer);
        setTimeout(() => { this.isScanning = false; this.scanProgress = 0; }, 1200);
        return;
      }
      step = Math.min(
        Math.floor((this.scanProgress / 100) * this.scanSteps.length),
        this.scanSteps.length - 2
      );
      this.scanStep = this.scanSteps[step];
    }, 350);
  }

  cancelScan(): void {
    this.stopScan();
    this.isScanning   = false;
    this.scanProgress = 0;
  }

  private stopScan(): void {
    if (this.scanTimer) { clearInterval(this.scanTimer); this.scanTimer = null; }
  }

  onCarImgError(e: Event): void {
    (e.target as HTMLImageElement).style.opacity = '0.15';
  }
}
