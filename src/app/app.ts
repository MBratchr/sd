import { Component, inject } from '@angular/core';
import { FileViewer } from './file-viewer/file-viewer';
import { InspectionManager } from './inspection-manager/inspection-manager';
import { RegisterTrace } from './register-trace/register-trace';
import { TraceResultService } from './services/trace-result.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileViewer, InspectionManager, RegisterTrace],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private traceResult = inject(TraceResultService);
  readonly backendResult = this.traceResult.result;

  isDarkMode =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }
}