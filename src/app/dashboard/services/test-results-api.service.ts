import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TestStepResult } from '../models/test-results-data';

export interface PipelineExecutionResponse {
  runId: number;
  executionId: string;
  State: string;    
  Result?: string;  
}
@Injectable({
  providedIn: 'root'
})
export class TestResultsApiService {
  private apiUrl = environment.apiUrl;
  private readonly azureDevOpsUrl = 'https://ced-cloud-tfs.visualstudio.com'; 
  constructor(private http: HttpClient) { }

 private getUserId(): string {
    const userId = localStorage.getItem('user_id');
    return userId || 'default';
  }

  triggerPipeline(projectName: string, pipelineId: number, scheduledTime?: Date): Observable<PipelineExecutionResponse> {
    const userId = this.getUserId();
    let url = `${this.apiUrl}/api/QAUser/trigger-pipeline/${userId}/${encodeURIComponent(projectName)}/${pipelineId}`;
    
    if (scheduledTime) {
      const params = new HttpParams().set('scheduledTime', scheduledTime.toISOString());
      return this.http.post<PipelineExecutionResponse>(url, {}, { params })
        .pipe(catchError(this.handleError));
    }
    
    return this.http.post<PipelineExecutionResponse>(url, {})
      .pipe(catchError(this.handleError));
  }

  getTestResults(runId: number, projectName: string): Observable<TestStepResult[]> {
    const userId = this.getUserId();
    return this.http.get<TestStepResult[]>(
      `${this.apiUrl}/api/QAUser/test-results/${userId}/${encodeURIComponent(projectName)}/${runId}`
    ).pipe(catchError(this.handleError));
  }

  downloadHtmlReport(projectName: string, pipelineId: number, runId: number): Observable<Blob> {
    const userId = this.getUserId();
    return this.http.get(
      `${this.apiUrl}/QAUser/download-report/${userId}/${encodeURIComponent(projectName)}/${pipelineId}/${runId}`,
      { responseType: 'blob' }
    ).pipe(catchError(this.handleError));
  }

  getPipelineUrl(projectName: string, pipelineId: number): string {
    // Format: https://organization/Project_name/_build?definitionId=pipeline_id
    return `${this.azureDevOpsUrl}/${projectName}/_build?definitionId=${pipelineId}`;
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}