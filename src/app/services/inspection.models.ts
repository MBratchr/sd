/* Models for inspection output */

/**
 * Legacy/older “normalized trace” model.
 * Keep this so you don't break existing code that still expects InspectionResult.
 */
export interface InspectionStep {
  line: number;

  // Registers: eax, ebx, ecx, edx, esi, edi, ebp, esp, ax, al, ah, etc.
  registers: Record<string, number>;

  // Flags: zf, cf, sf, of, pf, af, df, if
  flags: Record<string, number>;
}

export interface InspectionResult {
  runId?: string;
  steps: InspectionStep[];
}

/* -----------------------------
   Backend JSON model (NEW)
   Matches your real backend output
-------------------------------- */

export interface BackendRegisterValue {
  hex: string;
  u64: number;
  i64: number;
  bytes_le: string;
  ascii_le: string;
}

export interface BackendBreakpoint {
  line: number;
  registers: Record<string, BackendRegisterValue>;
  // If your backend later adds flags, add it here (example):
  // flags?: Record<string, 0 | 1>;
}

export interface BackendSandboxResponse {
  ok: boolean;
  stdout: string;
  breakpoints: BackendBreakpoint[];
  metadata?: {
    image?: string;
    [key: string]: unknown;
  };
}