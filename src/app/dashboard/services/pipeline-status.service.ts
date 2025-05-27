import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subject, throwError } from 'rxjs';
import { switchMap, takeUntil, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PipelineExecutionResponse {
  runId: number;
  State: string;
  Result: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PipelineStatusService {
  private readonly apiUrl = environment.apiUrl;
  private readonly pollingInterval = 10000; // 10 seconds
  private stopPolling$ = new Subject<void>(); // Notifier to stop polling

  constructor(
    private http: HttpClient
  ) {}

  
  getPipelineStatus(projectName: string, runId: number): Observable<PipelineExecutionResponse> {
    return this.http.get<PipelineExecutionResponse>(
      `${this.apiUrl}/api/QAUser/pipeline-status/${projectName}/${runId}`
    ).pipe(
      catchError(this.handleError)
    );
  }


  startPolling(projectName: string, runId: number): Observable<PipelineExecutionResponse> {
    return interval(this.pollingInterval).pipe(
      switchMap(() => this.getPipelineStatus(projectName, runId)),
      takeUntil(this.stopPolling$), // Stop polling when the notifier emits
      catchError(this.handleError)
    );
  }

  
  stopPolling(): void {
    this.stopPolling$.next(); 
    this.stopPolling$.complete(); 
  }

  
  private handleError(error: any): Observable<never> {
    console.error('Pipeline status error:', error);
    return throwError(() => error);
  }
}