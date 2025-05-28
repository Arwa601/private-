import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TestResultsSummary, TestStepResult } from '../../dashboard/models/test-results-data';

@Injectable({
  providedIn: 'root'
})
export class TestResultsStateService {
  private testResultsSubject = new BehaviorSubject<TestResultsSummary | null>(null);
  private lastRunId: number | null = null;
  private lastProjectName: string | null = null;

  testResults$ = this.testResultsSubject.asObservable();

  updateTestResults(summary: TestResultsSummary): void {
    this.testResultsSubject.next(summary);
    this.lastRunId = summary.runId;
    this.lastProjectName = summary.projectName;
    // Store in localStorage for persistence
    localStorage.setItem('lastTestResults', JSON.stringify(summary));
  }

  getLastRunInfo(): { runId: number | null; projectName: string | null } {
    return {
      runId: this.lastRunId,
      projectName: this.lastProjectName
    };
  }

  clearTestResults(): void {
    this.testResultsSubject.next(null);
    this.lastRunId = null;
    this.lastProjectName = null;
    localStorage.removeItem('lastTestResults');
  }

  restoreFromStorage(): void {
    const stored = localStorage.getItem('lastTestResults');
    if (stored) {
      try {
        const summary = JSON.parse(stored) as TestResultsSummary;
        this.updateTestResults(summary);
      } catch (error) {
        console.error('Error restoring test results:', error);
      }
    }
  }
}