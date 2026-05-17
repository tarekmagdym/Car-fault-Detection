// smoke.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SmokeColor = 'clear' | 'white' | 'blue' | 'black' | 'gray';
export type SeverityLevel = 'normal' | 'warning' | 'critical';

export interface SmokeResult {
  smokeColor: SmokeColor;
  coLevel: number;          // ppm
  hcLevel: number;          // ppm
  noxLevel: number;         // ppm
  opacity: number;          // 0-100%
  emissionStatus: 'Pass' | 'Fail' | 'Warning';
  diagnosis: string;
  severity: SeverityLevel;
  recommendations: string[];
  confidence: number;       // 0-100%
}

type FlowPhase = 'idle' | 'requesting' | 'scanning' | 'analyzing' | 'results';

@Component({
  selector: 'app-smoke',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smoke.component.html',
  styleUrl: './smoke.component.scss'
})
export class SmokeComponent implements OnInit, OnDestroy {

  @ViewChild('videoEl')  videoEl!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  // ── Flow state ────────────────────────────────────────────────────────────
  phase: FlowPhase = 'idle';
  cameraError: string | null = null;

  // ── Scan state ────────────────────────────────────────────────────────────
  scanProgress   = 0;
  scanStep       = '';
  analyzeProgress = 0;
  particles: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];

  // ── Simulation overlay ────────────────────────────────────────────────────
  detectionBoxes: { x: number; y: number; w: number; h: number; label: string; color: string }[] = [];
  overlayReading = { co: 0, hc: 0, opacity: 0 };

  // ── Results ───────────────────────────────────────────────────────────────
  result: SmokeResult | null = null;
  activeTab: 'overview' | 'gases' | 'advice' = 'overview';

  private stream: MediaStream | null = null;
  private scanTimer: any;
  private analyzeTimer: any;
  private particleTimer: any;
  private overlayTimer: any;
  private animFrame: any;

  private readonly scanSteps = [
    'Initializing exhaust sensor…',
    'Calibrating color spectrometer…',
    'Sampling exhaust particles…',
    'Measuring CO concentration…',
    'Measuring HC levels…',
    'Analyzing NOx emissions…',
    'Evaluating smoke opacity…',
    'Cross-referencing database…',
    'Compiling diagnostic report…',
  ];

  // Simulated result pool
  private readonly resultPool: SmokeResult[] = [
    {
      smokeColor: 'clear', coLevel: 42, hcLevel: 85, noxLevel: 120,
      opacity: 4, emissionStatus: 'Pass', severity: 'normal',
      diagnosis: 'Exhaust gases are within normal parameters. Complete combustion is occurring efficiently.',
      confidence: 94,
      recommendations: [
        'Continue regular maintenance schedule',
        'Next emission check in 12 months',
        'Air filter looks healthy — replace at 15,000 km'
      ]
    },
    {
      smokeColor: 'white', coLevel: 180, hcLevel: 420, noxLevel: 190,
      opacity: 38, emissionStatus: 'Warning', severity: 'warning',
      diagnosis: 'White smoke detected. Possible coolant leak into combustion chamber or head gasket issue.',
      confidence: 87,
      recommendations: [
        'Check coolant level immediately',
        'Inspect head gasket for leaks',
        'Monitor engine temperature closely',
        'Avoid highway driving until inspected'
      ]
    },
    {
      smokeColor: 'black', coLevel: 620, hcLevel: 890, noxLevel: 340,
      opacity: 72, emissionStatus: 'Fail', severity: 'critical',
      diagnosis: 'Black smoke indicates rich fuel mixture or clogged air filter. Incomplete combustion detected.',
      confidence: 91,
      recommendations: [
        'Replace air filter urgently',
        'Inspect fuel injectors for clogging',
        'Check mass airflow sensor',
        'Vehicle should not be driven — tow to workshop'
      ]
    },
    {
      smokeColor: 'blue', coLevel: 310, hcLevel: 650, noxLevel: 210,
      opacity: 45, emissionStatus: 'Fail', severity: 'critical',
      diagnosis: 'Blue smoke indicates oil burning in combustion chamber. Piston rings or valve seals may be worn.',
      confidence: 89,
      recommendations: [
        'Check engine oil level — top up if low',
        'Inspect valve stem seals',
        'Compression test recommended',
        'Schedule engine overhaul consultation'
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
      // give Angular time to render the video element
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
        // Animate live readings
        this.overlayReading.co      = Math.round(30 + Math.random() * 50);
        this.overlayReading.hc      = Math.round(70 + Math.random() * 80);
        this.overlayReading.opacity = Math.round(2 + Math.random() * 10);

        // Add detection box after 1.5s
        if (tick === 4 && this.detectionBoxes.length === 0) {
          this.detectionBoxes = [{
            x: 15, y: 10, w: 70, h: 55,
            label: 'EXHAUST DETECTED',
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
    // Pick a random result from pool for simulation
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

  setTab(t: 'overview' | 'gases' | 'advice'): void { this.activeTab = t; }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get severityConfig(): { label: string; color: string; glow: string } {
    switch (this.result?.severity) {
      case 'normal':   return { label: 'NORMAL',   color: '#22d37a', glow: 'rgba(34,211,122,0.4)' };
      case 'warning':  return { label: 'WARNING',  color: '#f5c518', glow: 'rgba(245,197,24,0.4)'  };
      case 'critical': return { label: 'CRITICAL', color: '#ff4d6d', glow: 'rgba(255,77,109,0.4)'  };
      default:         return { label: '',         color: '#2E8BFF', glow: 'rgba(46,139,255,0.4)'  };
    }
  }

  colorLabel(c: SmokeColor): string {
    const map: Record<SmokeColor, string> = {
      clear: 'CLEAR', white: 'WHITE SMOKE', blue: 'BLUE SMOKE',
      black: 'BLACK SMOKE', gray: 'GRAY SMOKE'
    };
    return map[c] ?? c.toUpperCase();
  }

  colorHex(c: SmokeColor): string {
    const map: Record<SmokeColor, string> = {
      clear: '#22d37a', white: '#e8f0ff', blue: '#7dd3fc',
      black: '#ff4d6d', gray: '#94a3b8'
    };
    return map[c] ?? '#2E8BFF';
  }

  coBar(v: number): number  { return Math.min((v / 800) * 100, 100); }
  hcBar(v: number): number  { return Math.min((v / 1000) * 100, 100); }
  noxBar(v: number): number { return Math.min((v / 500) * 100, 100); }

  gasColor(v: number, warn: number, crit: number): string {
    if (v >= crit) return '#ff4d6d';
    if (v >= warn) return '#f5c518';
    return '#22d37a';
  }
}


