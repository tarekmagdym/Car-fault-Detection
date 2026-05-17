// fluid-leak.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FluidType = 'fuel' | 'water' | 'oil' | 'brake' | 'coolant' | 'none';
export type SeverityLevel = 'normal' | 'warning' | 'critical';

export interface FluidResult {
  fluidType: FluidType;
  leakRate: number;          // ml/min
  poolSize: number;          // cm²
  pressure: number;          // relative 0-100
  contaminationRisk: number; // 0-100%
  emissionStatus: 'Safe' | 'Monitor' | 'Danger';
  diagnosis: string;
  severity: SeverityLevel;
  recommendations: string[];
  confidence: number;        // 0-100%
  location: string;          // e.g., "Front-left undercarriage"
}

type FlowPhase = 'idle' | 'requesting' | 'scanning' | 'analyzing' | 'results';

@Component({
  selector: 'app-fluid-leak',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fluid-leak.component.html',
  styleUrl: './fluid-leak.component.scss'
})
export class FluidLeakComponent implements OnInit, OnDestroy {

  @ViewChild('videoEl')  videoEl!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  // ── Flow state ────────────────────────────────────────────────────────────
  phase: FlowPhase = 'idle';
  cameraError: string | null = null;

  // ── Scan state ────────────────────────────────────────────────────────────
  scanProgress    = 0;
  scanStep        = '';
  analyzeProgress = 0;
  particles: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];

  // ── Simulation overlay ────────────────────────────────────────────────────
  detectionBoxes: { x: number; y: number; w: number; h: number; label: string; color: string }[] = [];
  overlayReading = { leakRate: 0, poolSize: 0, pressure: 0 };

  // ── Results ───────────────────────────────────────────────────────────────
  result: FluidResult | null = null;
  activeTab: 'overview' | 'metrics' | 'advice' = 'overview';

  private stream: MediaStream | null = null;
  private scanTimer: any;
  private analyzeTimer: any;
  private overlayTimer: any;

  private readonly scanSteps = [
    'Initializing fluid sensor array…',
    'Calibrating spectral analyzer…',
    'Scanning undercarriage zones…',
    'Identifying fluid signature…',
    'Measuring leak rate…',
    'Estimating pool area…',
    'Analyzing contamination risk…',
    'Cross-referencing fluid database…',
    'Compiling diagnostic report…',
  ];

  private readonly resultPool: FluidResult[] = [
    {
      fluidType: 'none', leakRate: 0, poolSize: 0, pressure: 8,
      contaminationRisk: 2, emissionStatus: 'Safe', severity: 'normal',
      location: 'No leak detected',
      diagnosis: 'No fluid leaks detected. All fluid systems appear intact and operating within normal parameters.',
      confidence: 96,
      recommendations: [
        'Continue regular fluid level checks every 5,000 km',
        'Next full fluid inspection at next service interval',
        'Monitor for any new stains on parking surface'
      ]
    },
    {
      fluidType: 'fuel', leakRate: 4.2, poolSize: 18, pressure: 62,
      contaminationRisk: 78, emissionStatus: 'Danger', severity: 'critical',
      location: 'Rear undercarriage — fuel tank area',
      diagnosis: 'Fuel leak detected near tank or fuel line. High ignition risk. Immediate action required.',
      confidence: 93,
      recommendations: [
        'Do NOT start the vehicle — fire hazard',
        'Keep ignition sources away from the vehicle',
        'Call a tow truck immediately',
        'Inspect fuel tank and fuel line connections',
        'Replace damaged fuel hose or tank seal'
      ]
    },
    {
      fluidType: 'water', leakRate: 1.8, poolSize: 30, pressure: 22,
      contaminationRisk: 15, emissionStatus: 'Monitor', severity: 'warning',
      location: 'Front-center — radiator area',
      diagnosis: 'Water / coolant drip from radiator or hose. Could indicate a loose hose clamp or minor crack.',
      confidence: 85,
      recommendations: [
        'Check coolant reservoir level before driving',
        'Inspect radiator hoses for cracks or loose clamps',
        'Monitor engine temperature gauge while driving',
        'Top up coolant and schedule inspection within 48 h'
      ]
    },
    {
      fluidType: 'oil', leakRate: 2.6, poolSize: 22, pressure: 45,
      contaminationRisk: 55, emissionStatus: 'Danger', severity: 'critical',
      location: 'Front-left — engine sump area',
      diagnosis: 'Engine oil leak detected. Oil on hot exhaust surfaces is a fire risk and causes engine wear.',
      confidence: 91,
      recommendations: [
        'Check engine oil level immediately',
        'Do not drive long distances with active oil leak',
        'Inspect oil sump gasket and drain plug',
        'Look for cracks in the oil pan',
        'Visit a workshop within 24 hours'
      ]
    },
    {
      fluidType: 'brake', leakRate: 0.9, poolSize: 8, pressure: 70,
      contaminationRisk: 88, emissionStatus: 'Danger', severity: 'critical',
      location: 'Rear-right — brake caliper area',
      diagnosis: 'Brake fluid leak detected near caliper or brake line. Braking performance may be severely compromised.',
      confidence: 88,
      recommendations: [
        'Do NOT drive — brakes may fail without warning',
        'Call emergency roadside assistance',
        'Inspect brake caliper seals and brake lines',
        'Bleed brake system after repair',
        'Replace brake fluid if contaminated'
      ]
    },
    {
      fluidType: 'coolant', leakRate: 3.1, poolSize: 25, pressure: 38,
      contaminationRisk: 42, emissionStatus: 'Monitor', severity: 'warning',
      location: 'Front — water pump / thermostat housing',
      diagnosis: 'Coolant leak from water pump or thermostat housing gasket. Risk of overheating if left unaddressed.',
      confidence: 90,
      recommendations: [
        'Top up coolant before any drive',
        'Avoid extended highway driving',
        'Inspect water pump weep hole and thermostat gasket',
        'Replace coolant hoses if swollen or brittle',
        'Schedule workshop visit within 3 days'
      ]
    }
  ];

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.generateParticles();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    clearInterval(this.scanTimer);
    clearInterval(this.analyzeTimer);
    clearInterval(this.overlayTimer);
  }

  generateParticles(): void {
    this.particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      speed: Math.random() * 0.4 + 0.1,
    }));
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  async requestCamera(): Promise<void> {
    this.phase = 'requesting';
    this.cameraError = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      this.phase = 'scanning';
      setTimeout(() => this.attachStream(), 100);
    } catch (err: any) {
      this.cameraError = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access and retry.'
        : 'Camera not available on this device.';
      this.phase = 'idle';
    }
  }

  private attachStream(): void {
    if (!this.videoEl) return;
    const video = this.videoEl.nativeElement;
    video.srcObject = this.stream;
    video.play().catch(() => {});
    setTimeout(() => this.startScan(), 800);
  }

  private stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  // ── Scan ──────────────────────────────────────────────────────────────────
  startScan(): void {
    this.scanProgress = 0;
    this.scanStep = this.scanSteps[0];
    this.startOverlayAnimation();

    this.scanTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.scanProgress += Math.random() * 8 + 3;
        if (this.scanProgress >= 100) {
          this.scanProgress = 100;
          this.scanStep = 'Fluid scan complete ✓';
          clearInterval(this.scanTimer);
          clearInterval(this.overlayTimer);
          setTimeout(() => this.startAnalysis(), 600);
          return;
        }
        const stepIdx = Math.min(
          Math.floor((this.scanProgress / 100) * this.scanSteps.length),
          this.scanSteps.length - 1
        );
        this.scanStep = this.scanSteps[stepIdx];
      });
    }, 380);
  }

  private startOverlayAnimation(): void {
    this.detectionBoxes = [];
    let tick = 0;
    this.overlayTimer = setInterval(() => {
      this.ngZone.run(() => {
        tick++;
        this.overlayReading.leakRate = +(Math.random() * 2).toFixed(1);
        this.overlayReading.poolSize  = Math.round(Math.random() * 15);
        this.overlayReading.pressure  = Math.round(10 + Math.random() * 30);

        if (tick === 4 && this.detectionBoxes.length === 0) {
          this.detectionBoxes = [{
            x: 12, y: 15, w: 75, h: 50,
            label: 'UNDERCARRIAGE SCAN',
            color: 'rgba(0,212,255,0.85)'
          }];
        }
      });
    }, 350);
  }

  // ── Analysis ──────────────────────────────────────────────────────────────
  startAnalysis(): void {
    this.phase = 'analyzing';
    this.stopCamera();
    this.analyzeProgress = 0;

    this.analyzeTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.analyzeProgress += Math.random() * 15 + 5;
        if (this.analyzeProgress >= 100) {
          this.analyzeProgress = 100;
          clearInterval(this.analyzeTimer);
          setTimeout(() => this.showResults(), 500);
        }
      });
    }, 200);
  }

  showResults(): void {
    this.result = { ...this.resultPool[Math.floor(Math.random() * this.resultPool.length)] };
    this.phase = 'results';
    this.activeTab = 'overview';
  }

  retryCamera(): void {
    this.result = null;
    this.phase = 'idle';
    this.cameraError = null;
    this.detectionBoxes = [];
    this.scanProgress = 0;
  }

  setTab(t: 'overview' | 'metrics' | 'advice'): void { this.activeTab = t; }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get severityConfig(): { label: string; color: string; glow: string } {
    switch (this.result?.severity) {
      case 'normal':   return { label: 'NORMAL',   color: '#22d37a', glow: 'rgba(34,211,122,0.4)'  };
      case 'warning':  return { label: 'WARNING',  color: '#f5c518', glow: 'rgba(245,197,24,0.4)'   };
      case 'critical': return { label: 'CRITICAL', color: '#ff4d6d', glow: 'rgba(255,77,109,0.4)'   };
      default:         return { label: '',         color: '#2E8BFF', glow: 'rgba(46,139,255,0.4)'   };
    }
  }

  fluidIcon(f: FluidType): string {
    const map: Record<FluidType, string> = {
      fuel: '⛽', water: '💧', oil: '🛢️', brake: '🔴', coolant: '🌡️', none: '✅'
    };
    return map[f] ?? '💧';
  }

  fluidLabel(f: FluidType): string {
    const map: Record<FluidType, string> = {
      fuel: 'FUEL LEAK', water: 'WATER LEAK', oil: 'OIL LEAK',
      brake: 'BRAKE FLUID', coolant: 'COOLANT LEAK', none: 'NO LEAK'
    };
    return map[f] ?? f.toUpperCase();
  }

  fluidColor(f: FluidType): string {
    const map: Record<FluidType, string> = {
      fuel:    '#f59e0b',
      water:   '#38bdf8',
      oil:     '#a16207',
      brake:   '#ff4d6d',
      coolant: '#34d399',
      none:    '#22d37a'
    };
    return map[f] ?? '#2E8BFF';
  }

  statusColor(s: string): string {
    if (s === 'Safe')    return '#22d37a';
    if (s === 'Monitor') return '#f5c518';
    return '#ff4d6d';
  }

  riskColor(v: number): string {
    if (v >= 70) return '#ff4d6d';
    if (v >= 35) return '#f5c518';
    return '#22d37a';
  }

  metricColor(v: number, warn: number, crit: number): string {
    if (v >= crit) return '#ff4d6d';
    if (v >= warn) return '#f5c518';
    return '#22d37a';
  }
}
