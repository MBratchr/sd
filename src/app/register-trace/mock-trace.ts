import type { TraceFrame } from './register-trace.models';

export const mockTrace: TraceFrame[] = [
  { line: 12, regs: { EAX: 4, EBX: 0, ECX: 0, EDX: 0 }, flags: { ZF: 0, CF: 0 } },
  { line: 13, regs: { EAX: 4, EBX: 1, ECX: 0, EDX: 0 }, flags: { ZF: 0, CF: 0 } },
  { line: 14, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 0 }, flags: { ZF: 0, CF: 0 } },
  { line: 15, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },
  { line: 16, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },
  { line: 18, regs: { EAX: 1, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },
  { line: 19, regs: { EAX: 1, EBX: 0, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 1, CF: 0 } },
  { line: 20, regs: { EAX: 1, EBX: 0, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 1, CF: 0 } },
];