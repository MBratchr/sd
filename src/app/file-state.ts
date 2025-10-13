import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileStateService {
  fileName = signal<string>('');
  lines = signal<string[]>([]);
  fileToken = signal<number>(0);         // bumps whenever a new file is set/cleared

  setFile(name: string, lines: string[]) {
    this.fileName.set(name);
    this.lines.set(lines);
    this.fileToken.update(v => v + 1);   // notify listeners
  }

  clearFile() {
    this.fileName.set('');
    this.lines.set([]);
    this.fileToken.update(v => v + 1);   // notify listeners
  }
}
