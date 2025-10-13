import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
 import { FileStateService } from '../file-state';
@Component({
  selector: 'file-viewer',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './file-viewer.html',
  styleUrls: ['./file-viewer.scss']
})
export class FileViewer {
  constructor(
    private cdr: ChangeDetectorRef,
    private fileState: FileStateService
  ) {}

  fileName = '';
  fileSize = 0;
  content = '';
  lines: string[] = [];
  error = '';
  warn = '';
  debug = true;

  private readonly asmLike = /\.(asm|s|inc)$/i;

  get isAsmLike(): boolean {
    return this.fileName ? this.asmLike.test(this.fileName) : false;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.loadFile(file);
    input.value = '';
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.loadFile(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  private loadFile(file: File) {
    this.error = '';
    this.warn = '';
    this.content = '';
    this.lines = [];

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

      // ✅ tell Angular to refresh the UI immediately
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.error = 'Failed to read file.';
      this.cdr.detectChanges();
    };
    reader.readAsText(file);
  }

  private applyContent(text: string) {
    this.content = text;
    this.lines = text.replace(/\r\n/g, '\n').split('\n');
    this.fileState.setFile(this.fileName, this.lines);
  }
}
