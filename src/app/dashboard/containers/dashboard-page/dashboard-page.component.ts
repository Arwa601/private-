import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule } from '@angular/common/http';
import { BehaviorSubject, catchError, of, map } from 'rxjs';
import { TestResultsApiService, PipelineExecutionResponse } from '../../services/test-results-api.service';
import { TestResult, TestStepResult } from '../../models/test-results-data';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    HttpClientModule
  ]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<TestResult>([]);
  displayedColumns: string[] = ['feature', 'scenario', 'status', 'exceptionType'];
  isLoading = false;
  error: string | null = null;
  pipelineRunId?: number;
  statusFilter = 'ALL';
  passedTestsCount = 0;
  failedTestsCount = 0;
  totalTestsCount = 0;
  selectedProject: { Name: string, Id: string } | null = null;
  selectedPipeline: { Id: number, Name: string } | null = null;
  pipelineStatus = new BehaviorSubject<{
    isRunning: boolean;
    progress?: number;
    currentStage?: string;
  }>({ isRunning: false });
  statusMessage = '';
  currentTestResults: {
    passedCount: number;
    failedCount: number;
    totalCount: number;
    details: TestResult[];
  } | null = null;
  currentExecution: {
    projectName: string;
    pipelineId: number;
    runId: number;
  } | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private testResultsService: TestResultsApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('DashboardPageComponent initialized');
    this.route.queryParams.subscribe(params => {
      const buildId = params['build_id'];
      if (buildId) {
        console.log(`Loading test results for build ID: ${buildId}`);
        this.pipelineRunId = +buildId;
        this.loadTestResults(this.pipelineRunId);
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  triggerPipeline(): void {
    if (!this.selectedProject || !this.selectedPipeline) {
      return;
    }

    const projectName = this.selectedProject.Name;
    const pipelineId = this.selectedPipeline.Id;

    this.currentExecution = {
      projectName,
      pipelineId,
      runId: 0
    };

    this.pipelineStatus.next({
      isRunning: true,
      progress: 0,
      currentStage: 'Initiating pipeline...'
    });

    this.testResultsService.triggerPipeline(projectName, pipelineId)
      .subscribe({
        next: (response: PipelineExecutionResponse) => {
          if (response.State.toLowerCase() === 'completed') {
            if (this.currentExecution) {
              this.currentExecution.runId = response.RunId;
            }
            this.loadTestResults(response.RunId);
          } else {
            const pipelineUrl = this.testResultsService.getPipelineUrl(projectName, pipelineId);
            this.statusMessage = `Warning: Pipeline is in state: ${response.State}. 
              Please check the pipeline logs to fix any issues: <a href="${pipelineUrl}" target="_blank">View Pipeline Details</a>`;
          }
          this.pipelineStatus.next({
            isRunning: false,
            progress: 100,
            currentStage: response.State
          });
        },
        error: (error: Error) => {
          console.error('Pipeline trigger error:', error);
          this.statusMessage = `Failed to trigger pipeline: ${error.message}`;
          this.pipelineStatus.next({
            isRunning: false,
            progress: 0,
            currentStage: 'Error'
          });
        }
      });
  }

  loadTestResults(runId?: number): void { 
    const idToUse = runId ?? this.pipelineRunId ?? 0; 
    if (!this.currentExecution?.projectName || idToUse === 0) {
      this.statusMessage = 'Waiting for pipeline execution to start...';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.testResultsService.getTestResults(idToUse, this.currentExecution.projectName)
      .pipe(
        map((results: TestStepResult[]) => results.map(result => ({
          id: result.Id?.toString() || '0',
          reportId: result.ReportId?.toString() || '0',
          feature: result.Feature,
          scenario: result.Scenario,
          status: result.Status,
          stepName: result.StepName,
          exceptionType: result.ExceptionType,
          exceptionMessage: result.ExceptionMessage,
          runId: idToUse
        } as TestResult))),
        catchError(error => {
          console.error('Error loading test results:', error);
          if (error.message.includes('Pipeline execution for build 0 not found')) {
            this.statusMessage = 'Waiting for pipeline execution to complete...';
          } else {
            this.statusMessage = `Error loading test results: ${error.message}`;
          }
          this.isLoading = false;
          return of([]);
        })
      )
      .subscribe({
        next: (results: TestResult[]) => {
          if (!results || results.length === 0) {
            this.statusMessage = 'No test results available yet.';
            this.isLoading = false;
            return;
          }

          this.currentTestResults = {
            passedCount: results.filter((r: TestResult) => r.status === 'PASSED').length,
            failedCount: results.filter((r: TestResult) => r.status === 'FAILED').length,
            totalCount: results.length,
            details: results
          };

          this.dataSource.data = results;
          this.passedTestsCount = this.currentTestResults.passedCount;
          this.failedTestsCount = this.currentTestResults.failedCount;
          this.totalTestsCount = this.currentTestResults.totalCount;

          const failedTests = results.filter((r: TestResult) => r.status === 'FAILED');
          this.statusMessage = `Test results loaded: ${this.currentTestResults.passedCount} passed, ${this.currentTestResults.failedCount} failed.`;

          if (failedTests.length > 0) {
            this.statusMessage += '\nFailed tests:\n';
            failedTests.forEach((test: TestResult) => {
              if (test.scenario) {
                this.statusMessage += `- ${test.feature}: ${test.scenario}\n`;
                if (test.exceptionMessage) {
                  this.statusMessage += `  Error: ${test.exceptionMessage}\n`;
                }
              }
            });
          }

          this.isLoading = false;
        },
        error: (error: Error) => {
          console.error('Error loading test results:', error);
          this.error = `Error loading test results: ${error.message}`;
          this.isLoading = false;
        }
      });
  }

  refreshTestResults(): void {
    if (!this.currentExecution) {
      this.statusMessage = 'No pipeline execution available to refresh results.';
      return;
    }

    this.statusMessage = 'Refreshing test results...';
    this.testResultsService.getTestResults(this.currentExecution.runId, this.currentExecution.projectName)
      .pipe(
        map((results: TestStepResult[]) => results.map(result => ({
          id: result.Id?.toString() || '0',
          reportId: result.ReportId?.toString() || '0',
          feature: result.Feature,
          scenario: result.Scenario,
          status: result.Status,
          stepName: result.StepName,
          exceptionType: result.ExceptionType,
          exceptionMessage: result.ExceptionMessage,
          duration: 0, // Default value since TestStepResult doesn't have duration
          timestamp: new Date(), // Default value since TestStepResult doesn't have timestamp
          runId: this.currentExecution!.runId
        } as TestResult))),
        catchError(error => {
          console.error('Error refreshing test results:', error);
          this.statusMessage = `Failed to refresh test results: ${error.message}`;
          return of([]);
        })
      )
      .subscribe({
        next: (results: TestResult[]) => {
          if (results && results.length > 0) {
            this.currentTestResults = {
              passedCount: results.filter((r: TestResult) => r.status === 'PASSED').length,
              failedCount: results.filter((r: TestResult) => r.status === 'FAILED').length,
              totalCount: results.length,
              details: results
            };

            this.dataSource.data = results;
            this.passedTestsCount = this.currentTestResults.passedCount;
            this.failedTestsCount = this.currentTestResults.failedCount;
            this.totalTestsCount = this.currentTestResults.totalCount;

            const failedTests = results.filter((r: TestResult) => r.status === 'FAILED');
            if (failedTests.length > 0) {
              this.statusMessage = `Test results refreshed: ${this.currentTestResults.passedCount} passed\n`;
              this.statusMessage += 'Failed tests:\n';
              failedTests.forEach((test: TestResult) => {
                if (test.scenario) {
                  this.statusMessage += `- ${test.feature}: ${test.scenario}\n`;
                  if (test.exceptionMessage) {
                    this.statusMessage += `  Error: ${test.exceptionMessage}\n`;
                  }
                }
              });
            } else {
              this.statusMessage = `All tests passed! Total: ${this.currentTestResults.totalCount}`;
            }
          } else {
            this.statusMessage = 'No test results found.';
          }
        },
        error: (error: Error) => {
          console.error('Error refreshing test results:', error);
          this.statusMessage = `Failed to refresh test results: ${error.message}`;
        }
      });
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;

    if (status === 'ALL') {
      this.dataSource.filter = '';
    } else {
      this.dataSource.filterPredicate = (data: TestResult, filter: string): boolean => {
        return data.status === filter;
      };
      this.dataSource.filter = status;
    }

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.statusFilter = 'ALL';

    this.dataSource.filterPredicate = (data: TestResult, filter: string): boolean => {
      const filterText = filter.toLowerCase();
      return data.feature.toLowerCase().includes(filterText) ||
             data.scenario.toLowerCase().includes(filterText) ||
             data.status.toLowerCase().includes(filterText) ||
             (data.exceptionType?.toLowerCase().includes(filterText) || false) ||
             (data.exceptionMessage?.toLowerCase().includes(filterText) || false);
    };

    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getStatusClass(status: string): string {
    return status === 'PASSED' ? 'status-passed' : 'status-failed';
  }

  viewTestDetails(result: TestResult): void {
    const details = `
      Feature: ${result.feature}
      Scenario: ${result.scenario}
      Status: ${result.status}
      Step: ${result.stepName}
      ${result.exceptionType ? `Error Type: ${result.exceptionType}` : ''}
      ${result.exceptionMessage ? `Error Message: ${result.exceptionMessage}` : ''}
    `;
    alert(details);
  }
}