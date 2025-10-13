import { Component, signal } from '@angular/core';
import { FileViewer } from './file-viewer/file-viewer';
import { InspectionManager } from './inspection-manager/inspection-manager';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileViewer, InspectionManager],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend-SLAIT');
}
