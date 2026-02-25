import * as core from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InspectionResult } from './inspection.models';

@core.Injectable({ providedIn: 'root' })
export class InspectionUploadService {
  private apiUrl = 'badlink';

  constructor(private http: HttpClient) {}

  uploadInspection(
    asmFile: File | Blob,
    instructions: Blob
  ): Observable<InspectionResult> {

    const formData = new FormData();
    formData.append('asmFile', asmFile);
    formData.append('instructions', instructions, 'inspection.txt');

    return this.http.post<InspectionResult>(this.apiUrl, formData);
  }
}
