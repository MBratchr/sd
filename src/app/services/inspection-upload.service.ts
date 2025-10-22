/* eslint-disable @angular-eslint/prefer-inject */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InspectionUploadService {
  private apiUrl = 'https://your-backend-domain.com/api/upload-inspection'; // ✅ replace with your backend URL

  constructor(private http: HttpClient) {}

  uploadInspection(asmFile: File | Blob, instructions: Blob): Observable<unknown> {
    const formData = new FormData();
    formData.append('asmFile', asmFile);
    formData.append('instructions', instructions, 'inspection.txt');

    return this.http.post(this.apiUrl, formData);
  }
}
