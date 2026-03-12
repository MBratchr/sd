import * as core from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendSandboxResponse } from './inspection.models';

@core.Injectable({ providedIn: 'root' })
export class InspectionUploadService {
  private apiUrl = "/api/inspect"; // set to your real backend endpoint when ready

  constructor(private http: HttpClient) {}

  /**
   * Uploads ASM + instruction lines and returns the backend JSON response.
   * This matches the format:
   * { ok, stdout, breakpoints: [ { line, registers: { rax: {hex,u64,...}, ... } } ], metadata }
   */
  uploadInspection(
    asmFile: File | Blob,
    instructions: Blob
  ): Observable<BackendSandboxResponse> {
    const formData = new FormData();
    formData.append('asmFile', asmFile);
    formData.append('instructions', instructions, 'inspection.txt');

    return this.http.post<BackendSandboxResponse>(this.apiUrl, formData);
  }
}