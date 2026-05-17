// battery.component.ts
import {
  Component, OnInit, OnDestroy, ElementRef,
  ViewChild, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ScanPhase = 'idle' | 'requesting' | 'scanning' | 'analyzing' | 'result';

export interface DetectionPin {
  id: string;
  label: string;
  severity: 'critical' | 'warning' | 'ok';
  confidence: number;
  x: number;
  y: number;
  detail: string;
  pulse: boolean;
}

export interface ScanResult {
  overallHealth: number;
  voltage: string;
  cca: string;
  temperature: string;
  chargeLevel: number;
  issues: DetectionPin[];
  summary: string;
  recommendation: string;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number; color: string;
}

@Component({
  selector: 'app-battery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './battery.component.html',
  styleUrl: './battery.component.scss',
})
export class BatteryComponent implements OnInit, OnDestroy {

  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  phase: ScanPhase = 'idle';
  cameraError = false;
  scanProgress  = 0;
  scanStep      = '';

  // Simulation state
  simActive       = false;
  simSweepY       = 0;
  simSweepDir     = 1;
  simGridOffset   = 0;
  simDataLines: string[] = [];
  simDataLineIdx  = 0;
  simParticles: Particle[] = [];
  activePins: DetectionPin[] = [];
  showHeatmap     = false;
  heatmapAlpha    = 0;
  analysisStage   = 0; // 0=off 1=grid 2=pins 3=heatmap

  result: ScanResult | null = null;
  activeIssue: DetectionPin | null = null;

  private stream: MediaStream | null = null;
  private animFrameId: any;
  private progressTimer: any;
  private dataLineTimer: any;
  private timeouts: any[] = [];

  readonly steps = [
    'Initializing neural engine…',
    'Calibrating optical sensors…',
    'Detecting battery outline…',
    'Reading terminal polarity…',
    'Scanning for corrosion markers…',
    'Measuring casing deformation…',
    'Thermal signature analysis…',
    'Cross-referencing battery DB…',
    'Compiling AI diagnostics…',
  ];

  private readonly dataStreamLines = [
    'BATT_DETECT: voltage=12.1V ± 0.04',
    'THERMAL_MAP: hotspot @ (65,30) Δ+4.2°C',
    'CORROSION_IDX: terminal_neg=0.73',
    'SWELL_COEFF: pos_side=1.18mm deform',
    'CCA_ESTIMATE: 480A (-12% nominal)',
    'CHARGE_STATE: 67% SOC',
    'IMPEDANCE: 8.4mΩ (+23% degraded)',
    'CELL_VOLT: 2.01 / 2.03 / 1.98 / 2.02',
    'PATTERN_MATCH: swelling_v3 conf=94%',
    'ACID_LEVEL: visual_estimate=LOW',
    'AI_VERDICT: REPLACE < 6 months',
  ];

  readonly mockResult: ScanResult = {
    overallHealth: 67,
    voltage: '12.1V',
    cca: '480A',
    temperature: '31°C',
    chargeLevel: 67,
    summary: 'Moderate degradation detected. Swelling on positive terminal side indicates internal gas buildup. Terminal corrosion increases resistance. Immediate monitoring recommended.',
    recommendation: 'Replace within 3–6 months',
    issues: [
      {
        id: 'swell',
        label: 'Casing Swollen',
        severity: 'critical',
        confidence: 94,
        x: 65, y: 30,
        detail: 'Battery casing on positive terminal side is expanded by ~1.18mm — a sign of internal gas buildup from overcharging or heat damage. This is a safety risk.',
        pulse: true,
      },
      {
        id: 'corr',
        label: 'Terminal Corrosion',
        severity: 'warning',
        confidence: 88,
        x: 36, y: 54,
        detail: 'White/blue sulphate residue on negative terminal. Increases internal resistance, causing hard starts and voltage drops under load.',
        pulse: false,
      },
      {
        id: 'casing',
        label: 'Casing Intact',
        severity: 'ok',
        confidence: 97,
        x: 50, y: 76,
        detail: 'No cracks, major fractures or acid leaks detected on the battery housing. Structure is sound.',
        pulse: false,
      },
    ],
  };

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnInit(): void {
    this.simDataLines = Array(8).fill('');
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  async startCamera(): Promise<void> {
    this.phase = 'requesting';
    this.cameraError = false;
    this.cdr.detectChanges();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setTimeout(() => {
        if (this.videoRef?.nativeElement && this.stream) {
          this.videoRef.nativeElement.srcObject = this.stream;
          this.videoRef.nativeElement.play();
          this.phase = 'scanning';
          this.startSim();
          this.cdr.detectChanges();
        }
      }, 120);
    } catch {
      this.cameraError = true;
      this.phase = 'idle';
      this.cdr.detectChanges();
    }
  }

  // ── Simulation ────────────────────────────────────────────────────────────
  private startSim(): void {
    this.simActive      = true;
    this.scanProgress   = 0;
    this.scanStep       = this.steps[0];
    this.activePins     = [];
    this.showHeatmap    = false;
    this.heatmapAlpha   = 0;
    this.analysisStage  = 0;
    this.simParticles   = [];
    this.simDataLineIdx = 0;
    this.simDataLines   = Array(8).fill('');

    // progress
    let stepIdx = 0;
    this.progressTimer = setInterval(() => {
      this.scanProgress += Math.random() * 6 + 2;
      if (this.scanProgress >= 100) {
        this.scanProgress = 100;
        clearInterval(this.progressTimer);
        this.beginAnalysis();
        this.cdr.detectChanges();
        return;
      }
      stepIdx = Math.min(
        Math.floor((this.scanProgress / 100) * this.steps.length),
        this.steps.length - 2,
      );
      this.scanStep = this.steps[stepIdx];
      this.cdr.detectChanges();
    }, 400);

    // data stream
    this.dataLineTimer = setInterval(() => {
      if (this.simDataLineIdx < this.dataStreamLines.length) {
        const lines = [...this.simDataLines];
        lines.shift();
        lines.push(this.dataStreamLines[this.simDataLineIdx++]);
        this.simDataLines = lines;
        this.cdr.detectChanges();
      }
    }, 850);

    // animation
    this.zone.runOutsideAngular(() => this.loop());
  }

  private loop(): void {
    // sweep
    this.simSweepY += this.simSweepDir * 0.55;
    if (this.simSweepY >= 100) { this.simSweepY = 100; this.simSweepDir = -1; }
    if (this.simSweepY <= 0)   { this.simSweepY = 0;   this.simSweepDir =  1; }

    // grid shift
    this.simGridOffset = (this.simGridOffset + 0.3) % 32;

    // particles
    if (Math.random() < 0.12 && this.phase === 'scanning') {
      this.simParticles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.35 + 0.05),
        life: 1,
        size: Math.random() * 2.5 + 0.5,
        color: Math.random() > 0.5 ? '#22d37a' : '#00D4FF',
      });
    }
    this.simParticles = this.simParticles
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.018 }))
      .filter(p => p.life > 0 && p.x > 0 && p.x < 100);

    this.zone.run(() => this.cdr.detectChanges());

    if (this.simActive) {
      this.animFrameId = requestAnimationFrame(() => this.loop());
    }
  }

  private beginAnalysis(): void {
    this.phase         = 'analyzing';
    this.analysisStage = 1;
    this.cdr.detectChanges();

    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(() => { fn(); this.cdr.detectChanges(); }, ms);
      this.timeouts.push(id);
    };

    // pins appear one by one
    t(500,  () => { this.activePins = [this.mockResult.issues[0]]; this.analysisStage = 2; });
    t(1000, () => { this.activePins = [...this.activePins, this.mockResult.issues[1]]; });
    t(1600, () => { this.activePins = [...this.activePins, this.mockResult.issues[2]]; });

    // heatmap
    t(2200, () => {
      this.showHeatmap  = true;
      this.analysisStage = 3;
      let a = 0;
      const fade = setInterval(() => {
        a += 0.035;
        this.heatmapAlpha = Math.min(a, 0.6);
        this.cdr.detectChanges();
        if (a >= 0.6) clearInterval(fade);
      }, 25);
    });

    // show result
    t(3600, () => {
      this.simActive = false;
      this.stopCamera();
      this.clearTimers();
      this.result = this.mockResult;
      this.phase  = 'result';
    });
  }

  private cleanup(): void {
    this.simActive = false;
    this.stopCamera();
    this.clearTimers();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private clearTimers(): void {
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.dataLineTimer) clearInterval(this.dataLineTimer);
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];
  }

  // ── Public ────────────────────────────────────────────────────────────────
  cancelScan(): void {
    this.cleanup();
    this.phase = 'idle'; this.scanProgress = 0;
    this.result = null; this.activeIssue = null;
    this.activePins = []; this.showHeatmap = false;
    this.cdr.detectChanges();
  }

  rescan(): void {
    this.result = null; this.activeIssue = null;
    this.activePins = []; this.showHeatmap = false;
    this.phase = 'idle'; this.scanProgress = 0;
  }

  openIssue(issue: DetectionPin): void { this.activeIssue = issue; }
  closeIssue(): void                   { this.activeIssue = null; }

  get healthColor(): string {
    if (!this.result) return '#2E8BFF';
    if (this.result.overallHealth >= 80) return '#22d37a';
    if (this.result.overallHealth >= 50) return '#f5c518';
    return '#ff4d6d';
  }

  sevColor(s: DetectionPin['severity']): string {
    return s === 'critical' ? '#ff4d6d' : s === 'warning' ? '#f5c518' : '#22d37a';
  }

  sevIcon(s: DetectionPin['severity']): string {
    return s === 'critical' ? '🚨' : s === 'warning' ? '⚠️' : '✅';
  }

  get dashOffset(): number {
    return this.result ? 314 - (314 * this.result.overallHealth / 100) : 314;
  }
}
