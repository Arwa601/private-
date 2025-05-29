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

  updateTestResults(results: TestStepResult[], runId?: number, projectName?: string): void {
    if (!results.length) return;

    const summary: TestResultsSummary = {
      totalFeatures: new Set(results.map(r => r.Feature)).size,
      totalSteps: results.length,
      passedSteps: results.filter(r => r.Status === 'PASSED').length,
      failedSteps: results.filter(r => r.Status === 'FAILED').length,
      overallPassRate: 0,
      features: this.calculateFeatureSummaries(results),
      recentResults: results, 
      lastUpdated: new Date(),
      runId: runId || 0,
      projectName: projectName || '',
      buildNumber: runId?.toString() || '0',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0
    };

    //pass rate
    summary.overallPassRate = (summary.passedSteps / summary.totalSteps) * 100;

    this.testResultsSubject.next(summary);
    this.lastRunId = summary.runId;
    this.lastProjectName = summary.projectName;
    localStorage.setItem('lastTestResults', JSON.stringify(summary));
  }

  private calculateFeatureSummaries(results: TestStepResult[]): any[] {
    const featureMap = new Map<string, TestStepResult[]>();
    
    results.forEach(result => {
      if (!featureMap.has(result.Feature)) {
        featureMap.set(result.Feature, []);
      }
      featureMap.get(result.Feature)?.push(result);
    });

    return Array.from(featureMap.entries()).map(([featureName, featureResults]) => ({
      featureName,
      totalSteps: featureResults.length,
      passedSteps: featureResults.filter(r => r.Status === 'PASSED').length,
      failedSteps: featureResults.filter(r => r.Status === 'FAILED').length,
    }));
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
        const storedSummary = JSON.parse(stored) as TestResultsSummary;
        // Create test results from the stored summary
        const testResults: TestStepResult[] = storedSummary.recentResults;
        if (testResults.length > 0) {
          this.updateTestResults(
            testResults,
            storedSummary.runId,
            storedSummary.projectName
          );
        }
      } catch (error) {
        console.error('Error restoring test results:', error);
      }
    }
  }
}