/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileStateService } from '../file-state';
import { InspectionUploadService } from '../services/inspection-upload.service';
import type { BackendSandboxResponse } from '../services/inspection.models';
import { RegisterTrace } from '../register-trace/register-trace';

interface Inspection {
  line: number;
  registers: { [key: string]: boolean };
  flags: { [key: string]: boolean };
  locked: boolean;
}

@Component({
  selector: 'inspection-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RegisterTrace],
  templateUrl: './inspection-manager.html',
  styleUrls: ['./inspection-manager.scss'],
})
export class InspectionManager {
  constructor(
    public fileState: FileStateService,
    private uploadService: InspectionUploadService,
    private cdr: ChangeDetectorRef
  ) {
    // Refresh filename & clear inspections on new file
    effect(() => {
      const _token = this.fileState.fileToken();
      this.currentFileName = this.fileState.fileName();
      this.resetInspections();

      // clear old backend output when file changes
      this.backendResponse = null;

      this.cdr.markForCheck();
    });
  }

  currentFileName = '';
  isUploading = false;

  /** Stores the JSON returned by the backend (your example payload) */
  backendResponse: BackendSandboxResponse | null = null;

  readonly registerOptions = [
    'EAX','EBX','ECX','EDX','ESI','EDI','EBP','ESP',
    'AX','BX','CX','DX','AL','AH','BL','BH','CL','CH','DL','DH'
  ];
  readonly flagOptions = ['ZF','CF','SF','OF','PF','AF','DF','IF'];

  inspections: Inspection[] = [];

  private resetInspections() { this.inspections = []; }

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

  canLock(i: number): boolean { return this.inspections[i].line > 0; }
  lockInspection(i: number) { this.inspections[i].locked = true; }
  deleteInspection(i: number) { this.inspections.splice(i, 1); }

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

  private buildExportLine(ins: Inspection): string {
    const parts: string[] = [];
    parts.push(`line:${ins.line}`);
    for (const r of this.registerOptions) {
      parts.push(`${r.toLowerCase()}:${ins.registers[r] ? 1 : 0}`);
    }
    for (const f of this.flagOptions) {
      parts.push(`${f.toLowerCase()}:${ins.flags[f] ? 1 : 0}`);
    }
    return parts.join(', ');
  }

  // "Test" → POST ASM + instructions to backend
  exportInspections() {
    const instructionLines = this.inspections
      .filter(ins => ins.locked)
      .map(ins => this.buildExportLine(ins));
    const instructionText = instructionLines.join('\n');

    const instructionsBlob = new Blob([instructionText], { type: 'text/plain' });

    const asmText = this.fileState.lines().join('\n');
    const asmBlob = new Blob([asmText], { type: 'text/plain' });

    const asmFile = new File(
      [asmBlob],
      this.fileState.fileName() || 'uploaded.asm',
      { type: 'text/plain' }
    );

    this.isUploading = true;

    this.uploadService.uploadInspection(asmFile, instructionsBlob).subscribe({
      next: (res) => {
        this.isUploading = false;

        // ✅ Store backend JSON for the widget
        this.backendResponse = res;

        console.log('Backend JSON:', res);
        alert('Inspection data sent to backend successfully.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isUploading = false;
        console.error('ERROR: Upload failed', err);
        alert('Upload failed. Check console for details.');
        this.cdr.markForCheck();
      }
    });
  }
}