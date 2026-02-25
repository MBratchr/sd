import { Component } from '@angular/core';
import { FileViewer } from './file-viewer/file-viewer';
import { InspectionManager } from './inspection-manager/inspection-manager';
import { RegisterTrace } from './register-trace/register-trace';
import type { TraceFrame } from './register-trace/register-trace.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileViewer, InspectionManager, RegisterTrace],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  isDarkMode =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  // Mock trace based on your NASM "Hello, World!" program
  mockTrace: TraceFrame[] = [
    // mov eax, 4
    { line: 12, regs: { EAX: 4, EBX: 0, ECX: 0, EDX: 0 }, flags: { ZF: 0, CF: 0 } },

    // mov ebx, 1
    { line: 13, regs: { EAX: 4, EBX: 1, ECX: 0, EDX: 0 }, flags: { ZF: 0, CF: 0 } },

    // mov ecx, msg
    { line: 14, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 0 }, flags: { ZF: 0, CF: 0 } },

    // mov edx, len  (len = 14)
    { line: 15, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },

    // int 0x80  (sys_write)
    { line: 16, regs: { EAX: 4, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },

    // mov eax, 1
    { line: 18, regs: { EAX: 1, EBX: 1, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 0, CF: 0 } },

    // xor ebx, ebx  (EBX -> 0, ZF -> 1)
    { line: 19, regs: { EAX: 1, EBX: 0, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 1, CF: 0 } },

    // int 0x80 (sys_exit)
    { line: 20, regs: { EAX: 1, EBX: 0, ECX: '0x0804A000', EDX: 14 }, flags: { ZF: 1, CF: 0 } },
  ];
}