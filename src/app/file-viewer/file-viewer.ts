import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileStateService } from '../file-state';

@Component({
  selector: 'file-viewer',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './file-viewer.html',
  styleUrls: ['./file-viewer.scss']
})
export class FileViewer {
  constructor(private fileState: FileStateService) {}

  // file state
  manualFileName = 'manual-input.asm';
  fileName = '';
  fileSize = 0;
  content = '';
  lines: string[] = [];
  error = '';
  warn = '';
  debug = false;

  // manual input state
  manualMode = false;   // true when user is typing lines directly
  manualLocked = false; // true after Done is pressed
  manualText = '';

  private readonly asmLike = /\.(asm|s|inc)$/i;

  get isAsmLike(): boolean {
    return this.fileName ? this.asmLike.test(this.fileName) : false;
  }

  // ----- file upload flow
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.exitManualModeIfNeeded();
    this.loadFile(file);
    input.value = '';
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (!file) return;
    this.exitManualModeIfNeeded();
    this.loadFile(file);
  }

  onDragOver(ev: DragEvent) { ev.preventDefault(); }

  private loadFile(file: File) {
    this.resetViewErrors();
    this.fileName = file.name;
    this.fileSize = file.size;

    if (!this.asmLike.test(file.name)) {
      this.warn = `File "${file.name}" doesn't look like .asm/.s/.inc, attempting to read anyway.`;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const raw = (reader.result as string) ?? '';
      const noBom = raw.replace(/^\uFEFF/, '');
      this.applyContent(noBom);
    };
    reader.onerror = () => { this.error = 'Failed to read file.'; };
    reader.readAsText(file);
  }

  private applyContent(text: string) {
    this.content = text;
    this.lines = text.replace(/\r\n/g, '\n').split('\n');
    // push to shared state so the right panel sees it
    this.fileState.setFile(this.fileName, this.lines);
  }

  private resetViewErrors() { this.error = ''; this.warn = ''; }

  private exitManualModeIfNeeded() {
    this.manualMode = false;
    this.manualLocked = false;
    // keep manualText as-is when switching from manual to file load
    // (you can clear it if you prefer): this.manualText = '';
  }

  // ----- manual input flow
  startManualInput() {
    this.resetViewErrors();
    this.manualMode = true;
    this.manualLocked = false;

    // ✅ reset current "file" context and right panel
    this.fileName = this.manualFileName;   // show a manual name immediately
    this.fileSize = 0;
    this.content = '';
    this.lines = [];
    this.fileState.clearFile();            // ✅ clears inspections & UI dependent on file

    // prefill editor if blank
    if (!this.manualText.trim()) {
      this.manualText = this.getBoilerplateTemplate();
    }
  }

  finishManualInput() {
    // Normalize EOLs and trim trailing blanks only
    const finalText = (this.manualText ?? '').replace(/\r\n/g, '\n').trimEnd();

    // Create/refresh the “virtual file” from the editor content
    if (!this.fileName) this.fileName = 'manual-input.asm';
    this.fileSize = new Blob([finalText]).size;

    this.manualLocked = true;     // lock editing
    this.applyContent(finalText); // updates content/lines and notifies service
  }

  private getBoilerplateTemplate(): string {
    return [
      '.386',
      '.model flat, stdcall',
      'option casemap:none',
      'INCLUDE Irvine32.inc',
      '',
      '.data',
      '; data goes here (if any)',
      '',
      '.code',
      'main PROC',
      '    ; code goes here',
      '    exit',
      'main ENDP',
      'END main'
    ].join('\n');
  }
  
}
