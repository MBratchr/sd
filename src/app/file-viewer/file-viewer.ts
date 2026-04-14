/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FileStateService } from '../file-state';

type ViewerTemplate = {
  id: string;
  label: string;
  file: string;
  suggestedFileName?: string;
};

@Component({
  selector: 'file-viewer',
  standalone: true,
  imports: [DecimalPipe, FormsModule, HttpClientModule],
  templateUrl: './file-viewer.html',
  styleUrls: ['./file-viewer.scss']
})
export class FileViewer {
  constructor(private fileState: FileStateService, private http: HttpClient) {
    this.loadTemplates();
  }

  // file state
  fileName = '';
  fileSize = 0;
  content = '';
  lines: string[] = [];
  error = '';
  warn = '';
  debug = false;

  // manual input state
  manualMode = false;
  manualLocked = false;
  manualText = '';
  manualFileName = 'manual-input.asm';

  // snippet input state
  snippetMode = false;
  snippetLocked = false;
  snippetDataText = '';
  snippetTextText = '';
  snippetFileName = 'snippet.asm';

  private readonly asmLike = /\.(asm|s|inc)$/i;

  get isAsmLike(): boolean {
    return this.fileName ? this.asmLike.test(this.fileName) : false;
  }

  // ----- template state
  templates: ViewerTemplate[] = [];
  selectedTemplateId = '';
  private readonly templateManifestUrl = '/file-viewer-templates/templates.json';


  private loadTemplates() {
    this.http.get<ViewerTemplate[]>(this.templateManifestUrl).subscribe({
      next: (list) => {
        this.templates = Array.isArray(list) ? list : [];

        // Prefer "default", else first item
        const preferred = this.templates.find((t) => t.id === 'default') ?? this.templates[0];
        this.selectedTemplateId = preferred ? preferred.id : '';
      },
      error: () => {
        this.templates = [];
        this.selectedTemplateId = '';
      }
    });
  }

  onTemplateChange(templateId: string) {
    this.selectedTemplateId = templateId;

    const tmpl = this.templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    if (tmpl.suggestedFileName) {
      this.manualFileName = tmpl.suggestedFileName;
    }

    this.http.get(tmpl.file, { responseType: 'text' }).subscribe({
      next: (text) => {
        this.manualText = (text ?? '').replace(/^\uFEFF/, '');
      },
      error: () => {
        this.warn = `Could not load template: ${tmpl.label}`;
      }
    });
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

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

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
    reader.onerror = () => {
      this.error = 'Failed to read file.';
    };
    reader.readAsText(file);
  }

  private applyContent(text: string) {
    this.content = text;
    this.lines = text.replace(/\r\n/g, '\n').split('\n');
    this.fileState.setFile(this.fileName, this.lines);
  }

  private resetViewErrors() {
    this.error = '';
    this.warn = '';
  }

  private exitManualModeIfNeeded() {
    this.manualMode = false;
    this.manualLocked = false;
    this.snippetMode = false;
    this.snippetLocked = false;
  }

  // ----- manual input flow
  startManualInput() {
    this.resetViewErrors();
    this.snippetMode = false;
    this.snippetLocked = false;
    this.manualMode = true;
    this.manualLocked = false;

    // reset the shared state so the right-side clears
    this.fileName = this.manualFileName;
    this.fileSize = 0;
    this.content = '';
    this.lines = [];
    this.fileState.clearFile();

    // If empty, load Default template (or first). No boilerplate.
    if (!this.manualText.trim()) {
      const preferred = this.templates.find((t) => t.id === 'default') ?? this.templates[0];
      if (preferred) {
        this.selectedTemplateId = preferred.id;
        this.onTemplateChange(preferred.id);
      } else {
        this.manualText = '';
      }
    }
  }

  finishManualInput() {
    const finalText = (this.manualText ?? '').replace(/\r\n/g, '\n').trimEnd();

    this.fileName = this.manualFileName || 'manual-input.asm';
    this.fileSize = new Blob([finalText]).size;

    this.manualLocked = true;
    this.applyContent(finalText);
  }

  // ----- snippet input flow
  startSnippetInput() {
    this.resetViewErrors();
    this.manualMode = false;
    this.manualLocked = false;
    this.snippetMode = true;
    this.snippetLocked = false;

    this.fileName = this.snippetFileName;
    this.fileSize = 0;
    this.content = '';
    this.lines = [];
    this.fileState.clearFile();
  }

  get canFinishSnippet(): boolean {
    return !!(this.snippetDataText.trim() || this.snippetTextText.trim());
  }

  finishSnippetInput() {
    const parts: string[] = [];

    const dataBlock = (this.snippetDataText ?? '').replace(/\r\n/g, '\n').trimEnd();
    const textBlock = (this.snippetTextText ?? '').replace(/\r\n/g, '\n').trimEnd();

    if (dataBlock) {
      parts.push('section .data');
      // indent each line of the user's data content
      for (const line of dataBlock.split('\n')) {
        parts.push('    ' + line);
      }
      parts.push('');
    }

    if (textBlock) {
      parts.push('section .text');
      // indent each line of the user's text content
      for (const line of textBlock.split('\n')) {
        parts.push('    ' + line);
      }
    }

    const finalText = parts.join('\n').trimEnd();

    this.fileName = this.snippetFileName || 'snippet.asm';
    this.fileSize = new Blob([finalText]).size;

    this.snippetLocked = true;
    this.applyContent(finalText);
  }
}