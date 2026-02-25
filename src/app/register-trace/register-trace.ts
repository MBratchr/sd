/* eslint-disable @angular-eslint/component-selector */
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  type ChartConfiguration,
  type ChartDataset,
} from 'chart.js';

import {
  TraceFrame,
  RegValue,
  BackendSandboxResponse,
  BackendRegisterValue,
} from './register-trace.models';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type FlagPlotMode = 'raw' | 'toggle';
type RegPlotMode = 'value' | 'toggle';

@Component({
  selector: 'register-trace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-trace.html',
  styleUrls: ['./register-trace.scss'],
})
export class RegisterTrace implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  @ViewChild('regsCanvas') regsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('flagsCanvas') flagsCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly _trace = signal<TraceFrame[]>([]);

  /** Accept either internal frames OR backend JSON response */
  @Input()
  set trace(value: TraceFrame[] | BackendSandboxResponse | null | undefined) {
    const frames = this.normalizeTraceInput(value);
    const normalized = frames.slice().sort((a, b) => a.line - b.line);
    this._trace.set(normalized);

    this.resetDefaults();
    this.refreshAllCharts();
  }

  // ----- UI state -----
  readonly regPlotMode = signal<RegPlotMode>('value');
  readonly flagPlotMode = signal<FlagPlotMode>('toggle');

  readonly selectedRegs = signal<string[]>([]);
  readonly selectedFlags = signal<string[]>([]);

  readonly lineFrom = signal<number | null>(null);
  readonly lineTo = signal<number | null>(null);

  // ----- Derived lists -----
  readonly regKeys = computed(() => {
    const frames = this._trace();
    const set = new Set<string>();
    for (const f of frames) Object.keys(f.regs ?? {}).forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly flagKeys = computed(() => {
    const frames = this._trace();
    const set = new Set<string>();
    for (const f of frames) Object.keys(f.flags ?? {}).forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly minLine = computed(() => {
    const frames = this._trace();
    return frames.length ? frames[0].line : 0;
  });

  readonly maxLine = computed(() => {
    const frames = this._trace();
    return frames.length ? frames[frames.length - 1].line : 0;
  });

  readonly filteredFrames = computed(() => {
    const frames = this._trace();
    if (!frames.length) return [];

    const from = this.lineFrom() ?? frames[0].line;
    const to = this.lineTo() ?? frames[frames.length - 1].line;

    return frames.filter((f) => f.line >= from && f.line <= to);
  });

  // ----- Charts -----
  private regsChart?: Chart<'line', number[], string>;
  private flagsChart?: Chart<'line', number[], string>;
  private themeObserver?: MutationObserver;

  ngAfterViewInit(): void {
    this.refreshAllCharts();

    // Watch your theme toggle (.page.light / .page.dark)
    const pageEl = this.hostRef.nativeElement.closest('.page') as HTMLElement | null;
    if (pageEl) {
      this.themeObserver = new MutationObserver(() => this.refreshAllCharts());
      this.themeObserver.observe(pageEl, { attributes: true, attributeFilter: ['class'] });
    }

    this.destroyRef.onDestroy(() => {
      this.themeObserver?.disconnect();
      this.themeObserver = undefined;

      this.regsChart?.destroy();
      this.flagsChart?.destroy();
      this.regsChart = undefined;
      this.flagsChart = undefined;
    });
  }

  // ----- Actions used by template -----
  resetDefaults(): void {
    const frames = this._trace();
    if (!frames.length) {
      this.selectedRegs.set([]);
      this.selectedFlags.set([]);
      this.lineFrom.set(null);
      this.lineTo.set(null);
      return;
    }

    const regs = this.regKeys();
    const flags = this.flagKeys();

    this.selectedRegs.set(regs.slice(0, Math.min(4, regs.length)));
    this.selectedFlags.set(flags.slice(0, Math.min(6, flags.length)));

    this.lineFrom.set(frames[0].line);
    this.lineTo.set(frames[frames.length - 1].line);
  }

  onRangeChange(): void {
    this.refreshAllCharts();
  }

  onRegModeChange(): void {
    this.refreshRegsChart();
  }

  onFlagModeChange(): void {
    this.refreshFlagsChart();
  }

  setSelectAllRegs(on: boolean): void {
    this.selectedRegs.set(on ? this.regKeys() : []);
    this.refreshRegsChart();
  }

  setSelectAllFlags(on: boolean): void {
    this.selectedFlags.set(on ? this.flagKeys() : []);
    this.refreshFlagsChart();
  }

  toggleReg(name: string, checked: boolean): void {
    const curr = new Set(this.selectedRegs());
    if (checked) curr.add(name);
    else curr.delete(name);
    this.selectedRegs.set(Array.from(curr));
    this.refreshRegsChart();
  }

  toggleFlag(name: string, checked: boolean): void {
    const curr = new Set(this.selectedFlags());
    if (checked) curr.add(name);
    else curr.delete(name);
    this.selectedFlags.set(Array.from(curr));
    this.refreshFlagsChart();
  }

  // ----- Backend -> TraceFrame normalization -----

  private isBackendResponse(v: unknown): v is BackendSandboxResponse {
    if (!v || typeof v !== 'object') return false;
    const obj = v as Record<string, unknown>;
    return Array.isArray(obj['breakpoints']);
  }

  private normalizeTraceInput(value: TraceFrame[] | BackendSandboxResponse | null | undefined): TraceFrame[] {
    if (!value) return [];

    // If already internal format
    if (Array.isArray(value)) return value;

    // Backend format
    if (this.isBackendResponse(value)) {
      return this.fromBackend(value);
    }

    return [];
  }

  /** Prefer a safe numeric value when reasonable; otherwise keep hex (string) */
  private pickBestRegValue(rv: BackendRegisterValue): RegValue {
    // If u64 is within JS safe integer, use it so "Value" chart can plot normally.
    // Otherwise keep hex (string).
    if (Number.isSafeInteger(rv.u64)) return rv.u64;
    return rv.hex;
  }

  private fromBackend(resp: BackendSandboxResponse): TraceFrame[] {
    const out: TraceFrame[] = [];

    for (const bp of resp.breakpoints ?? []) {
      const regs: Record<string, RegValue> = {};

      for (const [name, rv] of Object.entries(bp.registers ?? {})) {
        regs[name] = this.pickBestRegValue(rv);
      }

      out.push({
        line: bp.line,
        regs,
        // backend sample doesn’t include flags yet; keep empty/undefined
        flags: undefined,
      });
    }

    return out;
  }

  // ----- Value helpers -----
  private rawReg(frame: TraceFrame, key: string): RegValue {
    return frame.regs && key in frame.regs ? frame.regs[key] : null;
  }

  private rawFlag(frame: TraceFrame, key: string): RegValue {
    return frame.flags && key in frame.flags ? frame.flags[key] : null;
  }

  /**
   * Heuristic: treat large hex values as pointers/addresses so they don't blow up the
   * "register value" chart scaling.
   */
  private isProbablyAddressHex(s: string): boolean {
    const t = s.trim().toLowerCase();
    if (!t.startsWith('0x')) return false;

    const n = parseInt(t.slice(2), 16);
    return Number.isFinite(n) && n >= 0x0010_0000; // >= 1MB
  }

  private toNumber(v: RegValue, opts?: { ignoreAddresses?: boolean }): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;

    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (!s) return null;

      if (s.startsWith('0x')) {
        if (opts?.ignoreAddresses && this.isProbablyAddressHex(s)) return null;
        const n = parseInt(s.slice(2), 16);
        return Number.isFinite(n) ? n : null;
      }

      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }

    return null;
  }

  private buildToggleSeries(values: RegValue[]): number[] {
    const out: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i === 0) {
        out.push(0);
        continue;
      }

      const prev = values[i - 1];
      const curr = values[i];

      const pn = this.toNumber(prev);
      const cn = this.toNumber(curr);

      const changed =
        pn !== null && cn !== null ? pn !== cn : String(prev ?? '') !== String(curr ?? '');

      out.push(changed ? 1 : 0);
    }
    return out;
  }

  private buildFlagSeries(frames: TraceFrame[], key: string, mode: FlagPlotMode): number[] {
    const values = frames.map((f) => this.rawFlag(f, key));

    if (mode === 'raw') {
      return values.map((v) => {
        const n = this.toNumber(v);
        return n === 0 || n === 1 ? n : NaN;
      });
    }

    return this.buildToggleSeries(values);
  }

  private buildRegSeries(frames: TraceFrame[], key: string, mode: RegPlotMode): number[] {
    const values = frames.map((f) => this.rawReg(f, key));

    if (mode === 'value') {
      // Ignore pointer-like hex addresses so axis stays sane.
      return values.map((v) => {
        const n = this.toNumber(v, { ignoreAddresses: true });
        return n === null ? NaN : n;
      });
    }

    return this.buildToggleSeries(values);
  }

  // ----- Theme + colors -----
  private cssVar(el: HTMLElement, name: string, fallback: string): string {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fallback;
  }

  private signalColor(index: number, isDark: boolean): { stroke: string; fill: string } {
    const hue = (index * 137.508) % 360;
    const sat = 78;
    const light = isDark ? 62 : 45;

    const stroke = `hsl(${hue} ${sat}% ${light}%)`;
    const fill = `hsla(${hue} ${sat}% ${light}% / 0.18)`;
    return { stroke, fill };
  }

  private baseTheme(canvas: HTMLCanvasElement) {
    const isDark = this.cssVar(canvas, '--rt-is-dark', '1') === '1';
    const text = this.cssVar(canvas, '--rt-text', '#f5f5f7');
    const muted = this.cssVar(canvas, '--rt-muted', 'rgba(245,245,247,0.75)');
    const grid = this.cssVar(canvas, '--rt-grid', 'rgba(255,255,255,0.12)');
    return { isDark, text, muted, grid };
  }

  // ----- Chart config builders -----
  private buildRegsConfig(canvas: HTMLCanvasElement): ChartConfiguration<'line', number[], string> {
    const frames = this.filteredFrames();
    const keys = this.selectedRegs();
    const labels = frames.map((f) => String(f.line));
    const mode = this.regPlotMode();

    const { isDark, text, muted, grid } = this.baseTheme(canvas);

    const datasets: ChartDataset<'line', number[]>[] = keys.map((k, idx) => {
      const c = this.signalColor(idx, isDark);
      return {
        label: mode === 'toggle' ? `${k} (Δ)` : k,
        data: this.buildRegSeries(frames, k, mode),
        stepped: mode === 'toggle',
        tension: 0,
        pointRadius: 2,
        borderWidth: 2,
        borderColor: c.stroke,
        backgroundColor: c.fill,
        pointBackgroundColor: c.stroke,
        pointBorderColor: c.stroke,
      };
    });

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true, labels: { color: text } },
          tooltip: { enabled: true, titleColor: text, bodyColor: text },
        },
        scales: {
          x: {
            title: { display: true, text: 'Line #', color: muted },
            ticks: { color: muted },
            grid: { color: grid },
          },
          y: {
            title: { display: true, text: mode === 'toggle' ? 'Changed (0/1)' : 'Value', color: muted },
            ticks: mode === 'toggle' ? { stepSize: 1, color: muted } : { color: muted },
            grid: { color: grid },
            min: mode === 'toggle' ? 0 : undefined,
            max: mode === 'toggle' ? 1 : undefined,
          },
        },
      },
    };
  }

  private buildFlagsConfig(canvas: HTMLCanvasElement): ChartConfiguration<'line', number[], string> {
    const frames = this.filteredFrames();
    const keys = this.selectedFlags();
    const labels = frames.map((f) => String(f.line));
    const mode = this.flagPlotMode();

    const { isDark, text, muted, grid } = this.baseTheme(canvas);

    const datasets: ChartDataset<'line', number[]>[] = keys.map((k, idx) => {
      const c = this.signalColor(idx, isDark);
      return {
        label: mode === 'toggle' ? `${k} (Δ)` : k,
        data: this.buildFlagSeries(frames, k, mode),
        stepped: true,
        tension: 0,
        pointRadius: 2,
        borderWidth: 2,
        borderColor: c.stroke,
        backgroundColor: c.fill,
        pointBackgroundColor: c.stroke,
        pointBorderColor: c.stroke,
      };
    });

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: true, labels: { color: text } },
          tooltip: { enabled: true, titleColor: text, bodyColor: text },
        },
        scales: {
          x: {
            title: { display: true, text: 'Line #', color: muted },
            ticks: { color: muted },
            grid: { color: grid },
          },
          y: {
            title: { display: true, text: mode === 'toggle' ? 'Changed (0/1)' : 'Value (0/1)', color: muted },
            min: 0,
            max: 1,
            ticks: { stepSize: 1, color: muted },
            grid: { color: grid },
          },
        },
      },
    };
  }

  // ----- Refreshers -----
  refreshAllCharts(): void {
    this.refreshRegsChart();
    this.refreshFlagsChart();
  }

  private refreshRegsChart(): void {
    const canvas = this.regsCanvas?.nativeElement;
    if (!canvas) return;

    const cfg = this.buildRegsConfig(canvas);

    if (!this.regsChart) {
      this.regsChart = new Chart<'line', number[], string>(canvas, cfg);
      return;
    }

    this.regsChart.data.labels = cfg.data.labels ?? [];
    this.regsChart.data.datasets = cfg.data.datasets ?? [];
    this.regsChart.options = cfg.options ?? {};
    this.regsChart.update();
  }

  private refreshFlagsChart(): void {
    const canvas = this.flagsCanvas?.nativeElement;
    if (!canvas) return;

    const cfg = this.buildFlagsConfig(canvas);

    if (!this.flagsChart) {
      this.flagsChart = new Chart<'line', number[], string>(canvas, cfg);
      return;
    }

    this.flagsChart.data.labels = cfg.data.labels ?? [];
    this.flagsChart.data.datasets = cfg.data.datasets ?? [];
    this.flagsChart.options = cfg.options ?? {};
    this.flagsChart.update();
  }
}