import { Injectable, signal } from '@angular/core';
import type { BackendSandboxResponse } from './inspection.models';

@Injectable({ providedIn: 'root' })
export class TraceResultService {
  readonly result = signal<BackendSandboxResponse | null>(null);

  setResult(res: BackendSandboxResponse) {
    this.result.set(res);
  }
}