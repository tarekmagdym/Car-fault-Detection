// rust.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export type RustColor = 'none' | 'light' | 'moderate' | 'severe' | 'critical';
export type SeverityLevel = 'normal' | 'warning' | 'critical';

export interface RustResult {
  rustColor: RustColor;
  coverageArea: number;     // % of surface affected
  depthScore: number;       // 0–100 penetration index
  spreadRate: number;       // mm/year estimated spread
  structuralRisk: number;   // 0–100 structural integrity loss
  emissionStatus: 'Pass' | 'Fail' | 'Warning';
  diagnosis: string;
  severity: SeverityLevel;
  recommendations: string[];
  confidence: number;       // 0–100%
}

type FlowPhase = 'idle' | 'requesting' | 'scanning' | 'analyzing' | 'results';

@Component({
  selector: 'app-rust',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rust.component.html',
  styleUrl: './rust.component.scss'
})
export class RustComponent implements OnInit, OnDestroy {

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
  overlayReading = { coverage: 0, depth: 0, spread: 0 };

  // ── Results ───────────────────────────────────────────────────────────────
  result: RustResult | null = null;
  activeTab: 'overview' | 'metrics' | 'advice' = 'overview';

  private stream: MediaStream | null = null;
  private scanTimer: any;
  private analyzeTimer: any;
  private particleTimer: any;
  private overlayTimer: any;
  private animFrame: any;

  private readonly scanSteps = [
    'Initializing optical sensor array…',
    'Calibrating corrosion spectrometer…',
    'Sampling surface oxidation…',
    'Measuring coverage area…',
    'Calculating penetration depth…',
    'Estimating spread velocity…',
    'Assessing structural integrity…',
    'Cross-referencing material database…',
    'Compiling corrosion report…',
  ];

  // Simulated result pool
  private readonly resultPool: RustResult[] = [
    {
      rustColor: 'none', coverageArea: 0, depthScore: 2, spreadRate: 0.1,
      structuralRisk: 1, emissionStatus: 'Pass', severity: 'normal',
      diagnosis: 'Surface is in excellent condition. No oxidation or corrosion detected. Protective coating is intact.',
      confidence: 96,
      recommendations: [
        'Maintain current protective coating schedule',
        'Re-inspect surface in 12 months',
        'Apply wax sealant for added UV protection'
      ]
    },
    {
      rustColor: 'light', coverageArea: 8, depthScore: 18, spreadRate: 1.2,
      structuralRisk: 12, emissionStatus: 'Warning', severity: 'warning',
      diagnosis: 'Early-stage surface oxidation detected. Rust is superficial and has not penetrated base material yet.',
      confidence: 88,
      recommendations: [
        'Sand affected area with 220-grit sandpaper',
        'Apply rust converter primer within 2 weeks',
        'Inspect for paint bubbling or chipping nearby',
        'Monitor spread rate over next 30 days'
      ]
    },
    {
      rustColor: 'severe', coverageArea: 47, depthScore: 68, spreadRate: 4.8,
      structuralRisk: 61, emissionStatus: 'Fail', severity: 'critical',
      diagnosis: 'Deep structural corrosion detected. Rust has penetrated beyond surface layer — base metal is compromised.',
      confidence: 93,
      recommendations: [
        'Immediate professional assessment required',
        'Do not apply load or stress to affected structure',
        'Cut out and replace corroded metal sections',
        'Full sandblasting and epoxy primer treatment needed'
      ]
    },
    {
      rustColor: 'moderate', coverageArea: 22, depthScore: 38, spreadRate: 2.9,
      structuralRisk: 34, emissionStatus: 'Warning', severity: 'warning',
      diagnosis: 'Moderate corrosion found across surface. Rust is actively spreading and has begun weakening the substrate.',
      confidence: 90,
      recommendations: [
        'Apply rust inhibitor treatment immediately',
        'Remove loose rust flakes mechanically',
        'Use two-part epoxy filler on pitted areas',
        'Schedule professional inspection within 30 days'
      ]
    },
  ];

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.generateParticles();
  }


  ngOnDestroy(): void {
    this.stopCamera();
    clearInterval(this.scanTimer);
    clearInterval(this.analyzeTimer);
    clearInterval(this.particleTimer);
    clearInterval(this.overlayTimer);
    cancelAnimationFrame(this.animFrame);
  }

  // ── Particle Background ───────────────────────────────────────────────────
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
    let stepIdx = 0;

    this.scanTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.scanProgress += Math.random() * 8 + 3;
        if (this.scanProgress >= 100) {
          this.scanProgress = 100;
          this.scanStep = 'Analysis complete ✓';
          clearInterval(this.scanTimer);
          clearInterval(this.overlayTimer);
          setTimeout(() => this.startAnalysis(), 600);
          return;
        }
        stepIdx = Math.min(
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
        this.overlayReading.coverage = Math.round(2 + Math.random() * 12);
        this.overlayReading.depth    = Math.round(5 + Math.random() * 20);
        this.overlayReading.spread   = parseFloat((0.5 + Math.random() * 1.5).toFixed(1));

        if (tick === 4 && this.detectionBoxes.length === 0) {
          this.detectionBoxes = [{
            x: 15, y: 10, w: 70, h: 55,
            label: 'CORROSION DETECTED',
            color: 'rgba(251,146,60,0.85)'
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

  // ── Navigation ────────────────────────────────────────────────────────────
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
      case 'normal':   return { label: 'CLEAN',    color: '#22d37a', glow: 'rgba(34,211,122,0.4)'  };
      case 'warning':  return { label: 'MODERATE', color: '#fb923c', glow: 'rgba(251,146,60,0.4)'  };
      case 'critical': return { label: 'CRITICAL', color: '#ef4444', glow: 'rgba(239,68,68,0.4)'   };
      default:         return { label: '',         color: '#f97316', glow: 'rgba(249,115,22,0.4)'  };
    }
  }

  rustLabel(c: RustColor): string {
    const map: Record<RustColor, string> = {
      none:     'NO RUST',
      light:    'LIGHT RUST',
      moderate: 'MODERATE RUST',
      severe:   'SEVERE RUST',
      critical: 'CRITICAL RUST',
    };
    return map[c] ?? c.toUpperCase();
  }

  rustHex(c: RustColor): string {
    const map: Record<RustColor, string> = {
      none:     '#22d37a',
      light:    '#fbbf24',
      moderate: '#fb923c',
      severe:   '#ef4444',
      critical: '#991b1b',
    };
    return map[c] ?? '#f97316';
  }

  metricColor(v: number, warn: number, crit: number): string {
    if (v >= crit) return '#ef4444';
    if (v >= warn) return '#fb923c';
    return '#22d37a';
  }
}