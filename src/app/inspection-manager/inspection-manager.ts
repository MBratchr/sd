/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileStateService } from '../file-state';

interface Inspection {
  line: number;
  registers: { [key: string]: boolean };
  flags: { [key: string]: boolean };
  locked: boolean;
}

@Component({
  selector: 'inspection-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inspection-manager.html',
  styleUrls: ['./inspection-manager.scss']
})
export class InspectionManager {
  constructor(public fileState: FileStateService) {}

  readonly registerOptions = [
    'EAX','EBX','ECX','EDX','ESI','EDI','EBP','ESP',
    'AX','BX','CX','DX','AL','AH','BL','BH','CL','CH','DL','DH'
  ];

  readonly flagOptions = ['ZF','CF','SF','OF','PF','AF','DF','IF'];

  inspections: Inspection[] = [];

  addInspection() {
    this.inspections.push({
      line: 0,
      registers: Object.fromEntries(this.registerOptions.map(r => [r, false])),
      flags: Object.fromEntries(this.flagOptions.map(f => [f, false])),
      locked: false
    });
  }

  updateLine(i: number, val: string) {
    const line = Number(val);
    if (
      line > 0 &&
      line <= this.fileState.lines().length &&
      !this.inspections.find((ins, idx) => idx !== i && ins.line === line)
    ) {
      this.inspections[i].line = line;
    } else {
      this.inspections[i].line = 0;
    }
  }

  canLock(i: number): boolean {
    return this.inspections[i].line > 0;
  }

  lockInspection(i: number) {
    this.inspections[i].locked = true;
  }

  deleteInspection(i: number) {
    this.inspections.splice(i, 1);
  }

  // ---- helpers used elsewhere (unchanged)
  hasAnyRegisters(ins: Inspection): boolean {
    return this.registerOptions.some(r => !!ins.registers[r]);
  }
  hasAnyFlags(ins: Inspection): boolean {
    return this.flagOptions.some(f => !!ins.flags[f]);
  }
  selectedRegistersText(ins: Inspection): string {
    const list = this.registerOptions.filter(r => ins.registers[r]);
    return list.length ? list.join(', ') : '—';
    }
  selectedFlagsText(ins: Inspection): string {
    const list = this.flagOptions.filter(f => ins.flags[f]);
    return list.length ? list.join(', ') : '—';
  }

  // ---- NEW: build one export line in the required format
  private buildExportLine(ins: Inspection): string {
    const parts: string[] = [];
    parts.push(`line:${ins.line}`);

    // registers first, in the exact order of registerOptions
    for (const r of this.registerOptions) {
      const key = r.toLowerCase();
      const val = ins.registers[r] ? 1 : 0;
      parts.push(`${key}:${val}`);
    }

    // then flags, in the exact order of flagOptions
    for (const f of this.flagOptions) {
      const key = f.toLowerCase();
      const val = ins.flags[f] ? 1 : 0;
      parts.push(`${key}:${val}`);
    }

    return parts.join(', ');
  }

  // ---- UPDATED: export all locked inspections using the new format
  exportInspections() {
    const lines = this.inspections
      .filter(ins => ins.locked)
      .map(ins => this.buildExportLine(ins));

    const text = lines.join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fileState.fileName() || 'inspections'}.txt`; // keep .txt
    a.click();

    URL.revokeObjectURL(url);
  }
}
