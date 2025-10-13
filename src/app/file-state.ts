import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileStateService {
  fileName = signal<string>('');
  lines = signal<string[]>([]);

  setFile(name: string, lines: string[]) {
    this.fileName.set(name);
    this.lines.set(lines);
  }

  clearFile() {
    this.fileName.set('');
    this.lines.set([]);
  }
}
