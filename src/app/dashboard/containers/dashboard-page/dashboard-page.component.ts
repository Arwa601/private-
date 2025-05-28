import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule } from '@angular/common/http';
import { BehaviorSubject, catchError, of, map, Subscription } from 'rxjs';
import { TestResultsApiService, PipelineExecutionResponse } from '../../services/test-results-api.service';
import { TestResult, TestStepResult, TestResultsSummary } from '../../models/test-results-data';
import { TestResultsStateService } from '../../../services/shared-dashboard-azureDevops/test-results-state.service';

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
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // DataSource and columns
  dataSource = new MatTableDataSource<TestResult>([]);
  displayedColumns: string[] = ['feature', 'scenario', 'status', 'exceptionType', 'exceptionMessage'];
  
  // Loading and error states
  isLoading = false;
  error: string | null = null;
  
  // Pipeline and execution details
  pipelineRunId?: number;
  statusFilter = 'ALL';

  // Time display properties
  timeDisplay = {
    currentDateTime: '',
    userLogin: 'Arwa601'
  };
  private timeUpdateInterval?: number;

  // Test result metrics
  totalPassedCount = 0;
  totalFailedCount = 0;
  totalTestCount = 0;
  passedTestsCount = 0;
  failedTestsCount = 0;
  totalTestsCount = 0;

  // Observable and state
  testResults$ = this.testResultsStateService.testResults$;
  private allTestResults: TestResult[] = [];

  // Project and pipeline selection
  selectedProject: { Name: string, Id: string } | null = null;
  selectedPipeline: { Id: number, Name: string } | null = null;

  // Pipeline status
  pipelineStatus = new BehaviorSubject<{
    isRunning: boolean;
    progress?: number;
    currentStage?: string;
  }>({ isRunning: false });

  // Messages and current state
  statusMessage = '';
  currentTestResults: TestResultsSummary | null = null;
  currentExecution: {
    projectName: string;
    pipelineId: number;
    runId: number;
  } | null = null;

  // Subscriptions and view children
  private subscriptions: Subscription[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private testResultsService: TestResultsApiService,
    private testResultsStateService: TestResultsStateService,
    private route: ActivatedRoute
  ) {
    this.startTimeUpdates();
    this.subscriptions.push(
      this.testResults$.subscribe(results => {
        if (results) {
          this.updateTestResultsDisplay(results);
        }
      })
    );
  }

  // Lifecycle methods
  ngOnInit(): void {
    console.log('DashboardPageComponent initialized');
    this.testResultsStateService.restoreFromStorage();
    this.setupRouteParamsSubscription();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
    // Time display methods
  private startTimeUpdates(): void {
    this.updateDateTime();
    this.timeUpdateInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  private updateDateTime(): void {
    const now = new Date();
    this.timeDisplay.currentDateTime = this.formatDateTime(now);
  }

  private formatDateTime(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  // Route subscription setup
  private setupRouteParamsSubscription(): void {
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const buildId = params['build_id'];
        const projectName = params['projectname'];
        if (buildId && projectName) {
          console.log(`Loading test results for build ID: ${buildId}`);
          this.pipelineRunId = +buildId;
          this.currentExecution = {
            projectName,
            pipelineId: 0,
            runId: +buildId
          };
          this.loadTestResults(this.pipelineRunId);
        }
      })
    );
  }

  // Test results display methods
  private updateTestResultsDisplay(results: TestResultsSummary): void {
    const mappedResults = results.recentResults.map(result => ({
      id: result.Id?.toString() || '0',
      reportId: result.ReportId?.toString() || '0',
      feature: result.Feature,
      scenario: result.Scenario,
      status: result.Status,
      stepName: result.StepName,
      exceptionType: result.ExceptionType,
      exceptionMessage: result.ExceptionMessage,
      duration: 0,
      timestamp: results.lastUpdated,
      runId: results.runId
    } as TestResult));

    this.allTestResults = mappedResults;
    this.dataSource.data = mappedResults;
    
    // Update counts
    this.passedTestsCount = results.passedSteps;
    this.failedTestsCount = results.failedSteps;
    this.totalTestsCount = results.totalSteps;
    
    // Update total counts
    this.totalPassedCount = this.passedTestsCount;
    this.totalFailedCount = this.failedTestsCount;
    this.totalTestCount = this.totalTestsCount;

    this.updateStatusMessage(results);
  }

  private updateStatusMessage(results: TestResultsSummary): void {
    this.statusMessage = `Test results loaded: ${results.passedSteps} passed, ${results.failedSteps} failed.`;
    
    const failedTests = results.recentResults.filter(r => r.Status === 'FAILED');
    if (failedTests.length > 0) {
      this.statusMessage += '\nFailed tests:\n';
      failedTests.forEach(test => {
        if (test.Scenario) {
          this.statusMessage += `- ${test.Feature}: ${test.Scenario}\n`;
          if (test.ExceptionMessage) {
            this.statusMessage += `  Error: ${test.ExceptionMessage}\n`;
          }
        }
      });
    }
  }

  // Main methods for test results handling
  loadTestResults(runId?: number): void {
    const idToUse = runId ?? this.pipelineRunId ?? 0;
    if (!this.currentExecution?.projectName || idToUse === 0) {
      this.statusMessage = 'Waiting for pipeline execution to start...';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.testResultsService.getTestResults(this.currentExecution.runId, this.currentExecution.projectName)
      .pipe(
        map((results: TestStepResult[]) => {
          console.log('Raw API response:', results);
          this.testResultsStateService.updateTestResults(
            results,
            this.currentExecution!.runId,
            this.currentExecution!.projectName
          );
          
          return results.map(result => ({
            id: result.Id?.toString() || '0',
            reportId: result.ReportId?.toString() || '0',
            feature: result.Feature,
            scenario: result.Scenario,
            status: result.Status,
            stepName: result.StepName,
            exceptionType: result.ExceptionType,
            exceptionMessage: result.ExceptionMessage,
            runId: idToUse
          } as TestResult));
        }),
        catchError(error => {
          console.error('Error loading test results:', error);
          this.handleTestResultsError(error);
          return of([]);
        })
      )
      .subscribe({
        next: (results: TestResult[]) => {
          console.log('Processed results:', results);
          this.handleTestResults(results);
        },
        error: (error: Error) => {
          console.error('Error in test results subscription:', error);
          this.error = `Error loading test results: ${error.message}`;
          this.isLoading = false;
        }
      });
  }

  private handleTestResults(results: TestResult[]): void {
    if (!results || results.length === 0) {
      this.statusMessage = 'No test results available yet.';
      this.isLoading = false;
      return;
    }

    this.allTestResults = results;
    this.dataSource.data = results;
    
    // Update total counts
    this.totalPassedCount = results.filter(r => r.status === 'PASSED').length;
    this.totalFailedCount = results.filter(r => r.status === 'FAILED').length;
    this.totalTestCount = results.length;
    
    this.isLoading = false;
  }

  private handleTestResultsError(error: any): void {
    if (error.message.includes('Pipeline execution for build 0 not found')) {
      this.statusMessage = 'Waiting for pipeline execution to complete...';
    } else {
      this.statusMessage = `Error loading test results: ${error.message}`;
    }
    this.isLoading = false;
  }

  // Pipeline methods
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
          this.handlePipelineResponse(response, projectName, pipelineId);
        },
        error: (error: Error) => {
          this.handlePipelineError(error);
        }
      });
  }

  private handlePipelineResponse(
    response: PipelineExecutionResponse, 
    projectName: string, 
    pipelineId: number
  ): void {
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
  }

  private handlePipelineError(error: Error): void {
    console.error('Pipeline trigger error:', error);
    this.statusMessage = `Failed to trigger pipeline: ${error.message}`;
    this.pipelineStatus.next({
      isRunning: false,
      progress: 0,
      currentStage: 'Error'
    });
  }

  // Filter and pagination methods
  filterByStatus(status: string): void {
    this.statusFilter = status;

    if (status === 'ALL') {
      this.dataSource.data = this.allTestResults;
    } else {
      this.dataSource.data = this.allTestResults.filter(result => result.status === status);
    }

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.statusFilter = 'ALL';

    const filterText = filterValue.trim().toLowerCase();
    this.dataSource.data = this.allTestResults.filter(result =>
      result.feature.toLowerCase().includes(filterText) ||
      result.scenario.toLowerCase().includes(filterText) ||
      result.status.toLowerCase().includes(filterText) ||
      (result.exceptionType?.toLowerCase().includes(filterText) || false) ||
      (result.exceptionMessage?.toLowerCase().includes(filterText) || false)
    );

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onPageChange(event: PageEvent): void {
    const startIndex = event.pageIndex * event.pageSize;
    const endIndex = startIndex + event.pageSize;
    const currentPageData = this.allTestResults.slice(startIndex, endIndex);
    
    // Update page-specific counts
    const pagePassedCount = currentPageData.filter(result => result.status === 'PASSED').length;
    const pageFailedCount = currentPageData.filter(result => result.status === 'FAILED').length;
    
    console.log(`Page ${event.pageIndex + 1}: Passed: ${pagePassedCount}, Failed: ${pageFailedCount}, Total: ${currentPageData.length}`);
  }

  // UI helper methods
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
      Time: ${this.formatDateTime(new Date())}
    `;
    alert(details);
  }
}