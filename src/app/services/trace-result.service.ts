import { Injectable, signal } from '@angular/core';
import type { BackendSandboxResponse } from './inspection.models';

@Injectable({ providedIn: 'root' })
export class TraceResultService {
  readonly result = signal<BackendSandboxResponse | null>(null);
  readonly selectedFlags = signal<string[]>([]);

  setResult(res: BackendSandboxResponse, flags: string[]) {
    this.selectedFlags.set(flags.map(f => f.toUpperCase()));
    this.result.set(res);
  }
}