export type Bit = 0 | 1;

export type RegValue = number | string | null;

export interface TraceFrame {
  line: number;
  regs: Record<string, RegValue>;
  flags?: Record<string, RegValue>;
}

/* ---------------- Backend JSON types ---------------- */

export interface BackendRegisterValue {
  hex: string;
  u64: number;
  i64: number;
  bytes_le: string;
  ascii_le: string;
  flags?: Record<string, number>;
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