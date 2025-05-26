import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PipelineStatus, TestResultsSummary, TestStepResult } from '../models/test-results-data';

export interface TestHistoryEntry {
  timestamp: Date;
  passRate: number;
  totalTests: number;
  buildNumber: string;
  branch: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestResultsService {
  private pipelineStatusSubject = new BehaviorSubject<PipelineStatus>({
    isRunning: false,
    progress: 0
  });
  pipelineStatus$ = this.pipelineStatusSubject.asObservable();

  // Keep track of test history in memory
  private testHistorySubject = new BehaviorSubject<TestHistoryEntry[]>([]);
  testHistory$ = this.testHistorySubject.asObservable();

  // Observable for latest test results
  private latestResultsSubject = new BehaviorSubject<TestStepResult[]>([]);
  latestResults$ = this.latestResultsSubject.asObservable();

  constructor(
    private http: HttpClient,
  ) {
    this.loadTestHistory();
  }

  private loadTestHistory(): void {
    // Load history from localStorage to persist between page refreshes
    const savedHistory = localStorage.getItem('testHistory');
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      this.testHistorySubject.next(history);
    }
  }

  private saveTestHistory(history: TestHistoryEntry[]): void {
    localStorage.setItem('testHistory', JSON.stringify(history));
    this.testHistorySubject.next(history);
  }

  getTestResults(): Observable<TestResultsSummary> {
    return this.http.get<TestResultsSummary>(`${environment.apiUrl}/api/test-results`).pipe(
      map(summary => {
        // Update test history when new results come in
        const history = this.testHistorySubject.value;
        history.push({
          timestamp: new Date(summary.lastUpdated),
          passRate: summary.overallPassRate,
          totalTests: summary.totalSteps,
          buildNumber: summary.buildNumber,
          branch: summary.branch || 'unknown'
        });
        // Keep last 100 entries
        if (history.length > 100) {
          history.shift();
        }
        this.saveTestHistory(history);
        return summary;
      })
    );
  }

  updatePipelineStatus(status: PipelineStatus) {
    if (status.isRunning === false && status.lastCompletedRun) {
      // When a pipeline completes, update test history
      const history = this.testHistorySubject.value;
      history.push({
        timestamp: status.lastCompletedRun.timestamp,
        passRate: status.lastCompletedRun.testsSummary.passed / status.lastCompletedRun.testsSummary.total * 100,
        totalTests: status.lastCompletedRun.testsSummary.total,
        buildNumber: status.lastCompletedRun.runId.toString(),
        branch: 'unknown'
      });
      this.saveTestHistory(history);
    }
    this.pipelineStatusSubject.next(status);
  }

  getLatestResults(limit: number = 50): Observable<TestStepResult[]> {
    return this.http.get<TestStepResult[]>(`${environment.apiUrl}/api/test-results/latest?limit=${limit}`).pipe(
      map(results => {
        this.latestResultsSubject.next(results);
        return results;
      }),
      catchError(error => {
        console.error('Error fetching latest results:', error);
        return of([]);
      })
    );
  }

  // New methods for test analysis

  getFlakyTests(): Observable<string[]> {
    return this.testHistory$.pipe(
      map(history => {
        // Identify tests that have inconsistent results
        // Implementation would analyze history to find tests that alternate between pass/fail
        return [];
      })
    );
  }

  getTestTrends(): Observable<{
    passRateTrend: number;
    totalTestsTrend: number;
    flakyTestsCount: number;
  }> {
    return this.testHistory$.pipe(
      map(history => {
        if (history.length < 2) {
          return { passRateTrend: 0, totalTestsTrend: 0, flakyTestsCount: 0 };
        }

        const recent = history.slice(-10);
        const passRateTrend = this.calculateTrend(recent.map(h => h.passRate));
        const totalTestsTrend = this.calculateTrend(recent.map(h => h.totalTests));
        
        return {
          passRateTrend,
          totalTestsTrend,
          flakyTestsCount: 0 
        };
      })
    );
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  // Method to get historical data for a specific test
  getTestHistory(featureName: string, scenario: string): Observable<TestStepResult[]> {
    return this.http.get<TestStepResult[]>(
      `${environment.apiUrl}/api/test-results/history?feature=${encodeURIComponent(featureName)}&scenario=${encodeURIComponent(scenario)}`
    ).pipe(
      catchError(error => {
        console.error('Error fetching test history:', error);
        return of([]);
      })
    );
  }
}
