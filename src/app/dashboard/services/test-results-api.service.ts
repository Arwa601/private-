import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TestStepResult } from '../models/test-results-data';
import { ArtifactResponse } from '../models/artifact-response';

export interface PipelineExecutionResponse {
  RunId: number;
  ExecutionId: string;
  State: string;
  Result: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestResultsApiService {
  private readonly apiUrl = environment.apiUrl;
  private readonly azureDevOpsUrl = 'https://ced-cloud-tfs.visualstudio.com';

  constructor(private http: HttpClient) {}

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
    if (runId === 0) {
      return throwError(() => new Error('Invalid run ID'));
    }

    const userId = this.getUserId();
    return this.http.get<TestStepResult[]>(
      `${this.apiUrl}/api/QAUser/azure-logs/${encodeURIComponent(projectName)}/${runId}`
    ).pipe(catchError(this.handleError));
  }

  downloadHtmlReport(projectName: string, pipelineId: number, runId: number): Observable<string> {
    const userId = this.getUserId();
    return this.http.get<ArtifactResponse>(
      `${this.apiUrl}/api/QAUser/download-artifact/${userId}/${encodeURIComponent(projectName)}/${pipelineId}/${runId}`
    ).pipe(
      map(response => {
        if (!response.Artifacts || response.Artifacts.length === 0) {
          throw new Error('No artifacts found');
        }
        // Get the download URL and ensure it has the format parameter
        const downloadUrl = response.Artifacts[0].DownloadUrl;
        return downloadUrl.includes('$format=zip') 
          ? downloadUrl 
          : `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}$format=zip`;
      }),
      catchError(this.handleError)
    );
  }

downloadFromAzureDevOps(downloadUrl: string): Observable<{ type: 'blob' | 'auth', data: Blob | string }> {
    const headers = new HttpHeaders({
      'Accept': '*/*'
    });

    return this.http.get(downloadUrl, {
      headers: headers,
      responseType: 'arraybuffer', 
      observe: 'response'
    }).pipe(
      map(response => {
        const contentType = response.headers.get('content-type');
        const data = response.body;

        console.log('Response details:', {
          contentType,
          dataLength: data?.byteLength,
          headers: response.headers.keys()
        });

        if (!data) {
          throw new Error('Empty response received');
        }

        if (contentType?.includes('text/html')) {
          const text = new TextDecoder().decode(data);
          if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in')) {
            return {
              type: 'auth' as const,
              data: downloadUrl 
            };
          }
        }

        return {
          type: 'blob' as const,
          data: new Blob([data], { type: contentType || 'application/octet-stream' })
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Download error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          headers: error.headers?.keys(),
          error: error.error
        });

        if (error.status === 401 || error.status === 403) {
          return throwError(() => ({
            type: 'auth' as const,
            data: downloadUrl
          }));
        }

        return throwError(() => new Error(this.getErrorMessage(error)));
      })
    );
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 404) {
      return 'Artifact not found or no longer available';
    }
    if (error.status === 401) {
      return 'Authentication required. Please login to Azure DevOps';
    }
    if (error.status === 403) {
      return 'Access denied. Please check your permissions';
    }
    if (!error.status) {
      return 'Network error occurred. Please check your connection';
    }
    return `Download failed: ${error.message}`;
  }
  getPipelineUrl(projectName: string, pipelineId: number): string {
    return `${this.azureDevOpsUrl}/${projectName}/_build?definitionId=${pipelineId}`;
  }

  getBuildUrl(projectName: string, runId: number): string {
    return `${this.azureDevOpsUrl}/${projectName}/_build/results?buildId=${runId}`;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof Error) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (typeof error.error === 'string') {
      // Server returned error as string
      errorMessage = `Error: ${error.error}`;
    } else if (error.error?.error) {
      // Server returned error object
      errorMessage = `Error: ${error.error.error}`;
    } else {
      // Default error message with status
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}