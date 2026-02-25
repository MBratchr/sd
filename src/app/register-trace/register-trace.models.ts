export type Bit = 0 | 1;

/**
 * What the widget internally plots / tables.
 * Keep as-is so the widget stays stable even if backend evolves.
 */
export type RegValue = number | string | null;

export interface TraceFrame {
  /** 1-based source line number */
  line: number;

  /** Register values at this line (numbers or strings like "0x10") */
  regs: Record<string, RegValue>;

  /** Optional flags at this line (typically 0/1) */
  flags?: Record<string, Bit>;
}

/* ---------------- Backend JSON types ---------------- */

export interface BackendRegisterValue {
  hex: string;
  u64: number; // note: may exceed JS safe integer in future
  i64: number;
  bytes_le: string;
  ascii_le: string;
}

export interface BackendBreakpoint {
  line: number;
  registers: Record<string, BackendRegisterValue>;
}

export interface BackendSandboxResponse {
  ok: boolean;
  stdout: string;
  breakpoints: BackendBreakpoint[];
  metadata?: Record<string, unknown>;
}