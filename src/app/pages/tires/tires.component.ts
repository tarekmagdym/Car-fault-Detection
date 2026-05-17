// tire.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TireCondition = 'new' | 'good' | 'worn' | 'bald' | 'damaged';
export type SeverityLevel = 'normal' | 'warning' | 'critical';

export interface TireResult {
  tireCondition: TireCondition;
  treadDepth: number;        // mm remaining
  wearPattern: string;       // e.g. "Center Wear", "Edge Wear", "Uniform"
  pressureIndex: number;     // 0–100 estimated pressure health
  crackScore: number;        // 0–100 sidewall crack severity
  safetyStatus: 'Pass' | 'Fail' | 'Warning';
  diagnosis: string;
  severity: SeverityLevel;
  recommendations: string[];
  confidence: number;        // 0–100%
}

type FlowPhase = 'idle' | 'requesting' | 'scanning' | 'analyzing' | 'results';

@Component({
  selector: 'app-tire',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tires.component.html',
  styleUrl: './tires.component.scss'
})
export class TireComponent implements OnInit, OnDestroy {

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
  overlayReading = { tread: 0, cracks: 0, wear: 0 };

  // ── Results ───────────────────────────────────────────────────────────────
  result: TireResult | null = null;
  activeTab: 'overview' | 'metrics' | 'advice' = 'overview';

  private stream: MediaStream | null = null;
  private scanTimer: any;
  private analyzeTimer: any;
  private overlayTimer: any;
  private animFrame: any;

  private readonly scanSteps = [
    'Initializing optical surface sensor…',
    'Calibrating tread depth analyzer…',
    'Mapping wear pattern geometry…',
    'Measuring groove depth…',
    'Scanning sidewall for cracks…',
    'Estimating pressure health index…',
    'Analyzing rubber compound age…',
    'Cross-referencing safety database…',
    'Compiling tire condition report…',
  ];

  private readonly resultPool: TireResult[] = [
    {
      tireCondition: 'new',
      treadDepth: 8.5,
      wearPattern: 'Uniform',
      pressureIndex: 96,
      crackScore: 2,
      safetyStatus: 'Pass',
      severity: 'normal',
      diagnosis: 'Tire is in excellent condition. Tread depth is well above legal limit. Sidewalls are clean with no visible cracking or deformation.',
      confidence: 95,
      recommendations: [
        'Rotate tires every 10,000 km to maintain uniform wear',
        'Check pressure monthly — keep within manufacturer spec',
        'Next inspection recommended at 20,000 km',
      ]
    },
    {
      tireCondition: 'good',
      treadDepth: 5.2,
      wearPattern: 'Slight Center Wear',
      pressureIndex: 78,
      crackScore: 14,
      safetyStatus: 'Pass',
      severity: 'normal',
      diagnosis: 'Tire condition is acceptable with moderate tread remaining. Minor center wear suggests slight over-inflation history. No structural concerns detected.',
      confidence: 91,
      recommendations: [
        'Adjust inflation pressure to recommended PSI',
        'Rotate tires at next service visit',
        'Monitor tread depth — replace below 3 mm',
        'Re-inspect in 6 months',
      ]
    },
    {
      tireCondition: 'worn',
      treadDepth: 2.8,
      wearPattern: 'Edge Wear',
      pressureIndex: 54,
      crackScore: 38,
      safetyStatus: 'Warning',
      severity: 'warning',
      diagnosis: 'Tread depth is approaching legal minimum. Edge wear pattern indicates under-inflation or alignment issue. Sidewall micro-cracks detected.',
      confidence: 89,
      recommendations: [
        'Plan tire replacement within 2,000 km',
        'Get wheel alignment checked immediately',
        'Inflate to correct pressure — edge wear indicates chronic under-inflation',
        'Avoid highway speeds until tires are replaced',
      ]
    },
    {
      tireCondition: 'bald',
      treadDepth: 0.9,
      wearPattern: 'Severe Uniform Bald',
      pressureIndex: 41,
      crackScore: 72,
      safetyStatus: 'Fail',
      severity: 'critical',
      diagnosis: 'CRITICAL: Tread depth is below legal limit. Hydroplaning risk is extreme. Extensive sidewall cracking detected — blowout risk is high.',
      confidence: 97,
      recommendations: [
        'Do NOT drive — replace tires immediately',
        'Vehicle is unsafe for road use in current condition',
        'Replace all four tires simultaneously recommended',
        'Have brakes and suspension inspected during tire change',
        'Check for rim damage from extended bald driving',
      ]
    },
  ];

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void { this.generateParticles(); }

  ngOnDestroy(): void {
    this.stopCamera();
    clearInterval(this.scanTimer);
    clearInterval(this.analyzeTimer);
    clearInterval(this.overlayTimer);
    cancelAnimationFrame(this.animFrame);
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
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
  }

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
        stepIdx = Math.min(Math.floor((this.scanProgress / 100) * this.scanSteps.length), this.scanSteps.length - 1);
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
        this.overlayReading.tread  = parseFloat((4 + Math.random() * 4).toFixed(1));
        this.overlayReading.cracks = Math.round(Math.random() * 20);
        this.overlayReading.wear   = Math.round(10 + Math.random() * 15);
        if (tick === 4 && this.detectionBoxes.length === 0) {
          this.detectionBoxes = [{ x: 10, y: 8, w: 75, h: 60, label: 'TIRE SURFACE DETECTED', color: 'rgba(56,189,248,0.85)' }];
        }
      });
    }, 350);
  }

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

  get severityConfig(): { label: string; color: string; glow: string } {
    switch (this.result?.severity) {
      case 'normal':   return { label: 'SAFE',     color: '#22d37a', glow: 'rgba(34,211,122,0.4)'  };
      case 'warning':  return { label: 'WORN',     color: '#38bdf8', glow: 'rgba(56,189,248,0.4)'  };
      case 'critical': return { label: 'CRITICAL', color: '#f43f5e', glow: 'rgba(244,63,94,0.4)'   };
      default:         return { label: '',         color: '#38bdf8', glow: 'rgba(56,189,248,0.4)'  };
    }
  }

  conditionLabel(c: TireCondition): string {
    const map: Record<TireCondition, string> = {
      new:     'NEW TIRE',
      good:    'GOOD CONDITION',
      worn:    'WORN TIRE',
      bald:    'BALD — UNSAFE',
      damaged: 'DAMAGED',
    };
    return map[c] ?? c.toUpperCase();
  }

  conditionHex(c: TireCondition): string {
    const map: Record<TireCondition, string> = {
      new:     '#22d37a',
      good:    '#38bdf8',
      worn:    '#fbbf24',
      bald:    '#f43f5e',
      damaged: '#a855f7',
    };
    return map[c] ?? '#38bdf8';
  }

  metricColor(v: number, warn: number, crit: number): string {
    if (v >= crit) return '#f43f5e';
    if (v >= warn) return '#fbbf24';
    return '#22d37a';
  }

  // tread: higher is better — inverse color logic
  treadColor(v: number): string {
    if (v <= 1.6) return '#f43f5e';
    if (v <= 3.0) return '#fbbf24';
    return '#22d37a';
  }
}