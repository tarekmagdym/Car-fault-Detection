// main-page.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SystemStatus {
  name: string;
  status: 'Good' | 'Warning' | 'Error';
  icon: string;
}

export interface FeatureStat {
  key: string;
  value: string;
}

export interface Feature {
  id: string;
  name: string;
  desc: string;
  longDesc: string;
  icon: string;
  iconBg: string;
  wide?: boolean;
  stats: FeatureStat[];
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
  menuOpen     = false;
  isScanning   = false;
  scanProgress = 0;
  scanStep     = 'Initializing…';
  activeFeature: Feature | null = null;
  activeTab    = 'home';

  healthPercent = 85;
  healthStatus  = 'Good Condition';

  private scanTimer: any;
  private scanSteps = [
    'Connecting to ECU…',
    'Reading engine codes…',
    'Checking battery health…',
    'Inspecting tire pressure…',
    'Analyzing brake system…',
    'Scanning fluid levels…',
    'Checking exhaust emissions…',
    'Reviewing sensor data…',
    'Compiling results…',
    'Scan complete ✓',
  ];

  // ── Gauge ─────────────────────────────────────────────────────────────────
  // circumference = 2π × 50 ≈ 314.16
  readonly circumference = 314.16;
  get gaugeOffset(): number {
    return this.circumference - (this.circumference * this.healthPercent) / 100;
  }

  // ── Radar Dots ───────────────────────────────────────────────────────────
  radarDots = Array.from({ length: 6 }, () => ({
    x: `${20 + Math.random() * 60}%`,
    y: `${20 + Math.random() * 60}%`,
  }));

  // ── Systems ──────────────────────────────────────────────────────────────
  systems: SystemStatus[] = [
    { name: 'Engine',  status: 'Good',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 7V5M17 7V5M3 13h2M19 13h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' },
    { name: 'Battery', status: 'Good',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="18" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M20 10v4M7 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' },
    { name: 'Tires',   status: 'Good',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>' },
    { name: 'Fluids',  status: 'Warning', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3C12 3 5 10 5 15a7 7 0 0 0 14 0c0-5-7-12-7-12z" stroke="currentColor" stroke-width="1.6"/></svg>' },
    { name: 'Sensors', status: 'Good',    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12.5C5 12.5 5 8 12 8s7 4.5 7 4.5S19 17 12 17s-7-4.5-7-4.5z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12.5" r="2" fill="currentColor"/></svg>' },
  ];

  // ── Features ─────────────────────────────────────────────────────────────
  features: Feature[] = [
    {
      id: 'rust',
      name: 'Rust Detection',
      desc: 'Detect rust and corrosion on car body',
      longDesc: 'Advanced AI-powered rust detection scans your entire vehicle body using visual pattern recognition to identify surface corrosion, undercoating issues, and paint degradation before they become serious.',
      icon: '🛡️',
      iconBg: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.15))',
      stats: [{ key: 'Last Scan', value: '2d ago' }, { key: 'Issues Found', value: '0' }, { key: 'Risk Level', value: 'Low' }],
    },
    {
      id: 'smoke',
      name: 'Smoke Analysis',
      desc: 'Analyze exhaust smoke and detect the issue',
      longDesc: 'Real-time exhaust smoke analysis identifies combustion problems, coolant leaks, oil burning, and emissions issues by analyzing smoke color, density, and chemical composition.',
      icon: '💨',
      iconBg: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))',
      stats: [{ key: 'CO Level', value: 'Normal' }, { key: 'Smoke Color', value: 'Clear' }, { key: 'Emission', value: 'Pass' }],
    },
    {
      id: 'tire',
      name: 'Tire Analysis',
      desc: 'Check tire condition, wear, pressure and safety',
      longDesc: 'Complete tire health assessment including tread depth measurement, pressure monitoring, wear pattern analysis, and sidewall inspection to maximize tire longevity and driving safety.',
      icon: '🔵',
      iconBg: 'linear-gradient(135deg, rgba(20,184,166,0.25), rgba(15,118,110,0.15))',
      stats: [{ key: 'Pressure', value: '32 PSI' }, { key: 'Tread Depth', value: '7mm' }, { key: 'Alignment', value: 'OK' }],
    },
    {
      id: 'fluid',
      name: 'Fluid Leakage Analysis',
      desc: 'Detect and analyze leaked fluids under the car',
      longDesc: 'AI vision system scans beneath your vehicle to detect, locate, and identify any fluid leaks. Identifies oil, coolant, brake fluid, transmission fluid, and power steering fluid by color and location.',
      icon: '💧',
      iconBg: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(14,165,233,0.15))',
      stats: [{ key: 'Oil Level', value: 'OK' }, { key: 'Coolant', value: 'Low' }, { key: 'Brake Fluid', value: 'OK' }],
    },
    {
      id: 'oil',
      name: 'Oil & Coolant Analysis',
      desc: 'Check oil quality, coolant condition and level',
      longDesc: 'Molecular analysis of your engine oil detects degradation, contamination, and metal particle levels. Coolant pH and freeze protection checks ensure your engine temperature stays regulated.',
      icon: '🧴',
      iconBg: 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(202,138,4,0.15))',
      stats: [{ key: 'Oil Life', value: '68%' }, { key: 'Next Change', value: '2,400 mi' }, { key: 'Coolant pH', value: '7.2' }],
    },
    {
      id: 'engine',
      name: 'Engine Diagnostics',
      desc: 'Full engine system scan and fault detection',
      longDesc: 'Deep OBD-II scan reads all ECU fault codes across engine, transmission, ABS and airbag systems. Identifies pending, confirmed, and permanent codes with plain-language explanations and fix recommendations.',
      icon: '⚙️',
      iconBg: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.15))',
      stats: [{ key: 'Fault Codes', value: '0' }, { key: 'RPM Idle', value: '780' }, { key: 'Temp', value: '92°C' }],
    },
    {
      id: 'battery',
      name: 'Battery Status',
      desc: 'Check battery health, charging system and voltage',
      longDesc: 'Comprehensive 12V battery assessment measures cold cranking amps, state of charge, and internal resistance. Alternator output and charging system voltage regulation also tested.',
      icon: '🔋',
      iconBg: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.15))',
      stats: [{ key: 'Voltage', value: '12.6V' }, { key: 'Health', value: '91%' }, { key: 'CCA', value: '540A' }],
    },
    {
      id: 'performance',
      name: 'Performance Analysis',
      desc: 'Analyze car performance and efficiency',
      longDesc: 'End-to-end performance benchmarking tests acceleration, braking response, fuel economy, and power output. Compares against factory specs and similar vehicles to highlight degradation areas.',
      icon: '📊',
      iconBg: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.15))',
      stats: [{ key: '0–60 mph', value: '7.4s' }, { key: 'MPG', value: '31.2' }, { key: 'HP Loss', value: '3%' }],
    },
    {
      id: 'history',
      name: 'History & Reports',
      desc: 'View previous scans, reports and maintenance history',
      longDesc: 'Complete diagnostic history with timestamped reports, trend graphs, and maintenance reminders. Export PDF reports for your mechanic or insurance company with one tap.',
      icon: '📋',
      iconBg: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.15))',
      wide: true,
      stats: [{ key: 'Total Scans', value: '24' }, { key: 'Last Report', value: '3d ago' }, { key: 'Alerts', value: '1' }],
    },
  ];

  // ── Nav Tabs ──────────────────────────────────────────────────────────────
  navTabs: NavTab[] = [
    { id: 'home',     label: 'Home',     icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.8"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.8"/></svg>' },
    { id: 'history',  label: 'History',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><polyline points="12 7 12 12 15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    { id: 'reports',  label: 'Reports',  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.8"/><line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
    { id: 'settings', label: 'Settings', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="1.8"/></svg>' },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopScan();
  }

  // ── Methods ───────────────────────────────────────────────────────────────
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }

  setTab(id: string): void { this.activeTab = id; }

  selectSystem(sys: SystemStatus): void {
    const match = this.features.find(f =>
      f.name.toLowerCase().includes(sys.name.toLowerCase()) ||
      sys.name.toLowerCase().includes(f.id)
    );
    if (match) this.openFeature(match);
  }

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
      step = Math.min(Math.floor((this.scanProgress / 100) * this.scanSteps.length), this.scanSteps.length - 2);
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
