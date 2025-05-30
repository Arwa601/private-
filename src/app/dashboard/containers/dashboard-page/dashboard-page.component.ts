import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { TestResultsApiService } from '../../services/test-results-api.service';
import { TestResult, TestStepResult, TestResultsSummary } from '../../models/test-results-data';
import { TestResultsStateService } from '../../../services/shared-dashboard-azureDevops/test-results-state.service';
import { AuthService } from '../../../components/login/auth.service';

interface TimeDisplay {
  currentDateTime: string;
  userLogin: string;
}

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
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  dataSource = new MatTableDataSource<TestResult>([]);
  displayedColumns: string[] = ['feature', 'scenario', 'status', 'exceptionType', 'exceptionMessage'];
  isLoading = false;
  error: string | null = null;
  pipelineRunId?: number;
  statusFilter = 'ALL';

  timeDisplay: TimeDisplay = {
    currentDateTime: '',
    userLogin: ''
  };
  private timeUpdateInterval?: number;

  totalPassedCount = 0;
  totalFailedCount = 0;
  totalTestCount = 0;
  passedTestsCount = 0;
  failedTestsCount = 0;
  totalTestsCount = 0;

  testResults$ = this.testResultsStateService.testResults$;
  allTestResults: TestResult[] = [];

  selectedProject: { Name: string, Id: string } | null = null;
  selectedPipeline: { Id: number, Name: string } | null = null;

  pipelineStatus = new BehaviorSubject<{
    isRunning: boolean;
    progress?: number;
    currentStage?: string;
  }>({ isRunning: false });

  statusMessage = '';
  currentTestResults: TestResultsSummary | null = null;
  currentExecution: {
    projectName: string;
    pipelineId: number;
    runId: number;
  } | null = null;

  private subscriptions: Subscription[] = [];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private testResultsService: TestResultsApiService,
    private testResultsStateService: TestResultsStateService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.startTimeUpdates();
    this.timeDisplay.userLogin = this.authService.getUserFullName();
    this.subscriptions.push(
      this.testResults$.subscribe(results => {
        if (results) {
          this.updateTestResultsDisplay(results);
        }
      })
    );
  }

  ngOnInit(): void {
    this.setupInitialData();
    this.setupRouteParamsSubscription();
  }

  ngAfterViewInit(): void {
    this.setupPaginator();
    this.setupSort();
  }

  ngOnDestroy(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupInitialData(): void {
    this.testResultsStateService.restoreFromStorage();
  }

  private setupPaginator(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      // Removed paginator.page.subscribe to avoid manual slicing
    }
  }

  private setupSort(): void {
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  private setupRouteParamsSubscription(): void {
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const buildId = params['build_id'];
        const projectName = params['projectname'];
        if (buildId && projectName) {
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

  private startTimeUpdates(): void {
    this.updateDateTime();
    this.timeUpdateInterval = window.setInterval(() => {
      this.updateDateTime();
    }, 1000);
  }

  private updateDateTime(): void {
    this.timeDisplay.currentDateTime = '2025-05-30 09:46:07';
  }

  refreshResults(): void {
    if (this.currentExecution?.runId) {
      this.loadTestResults(this.currentExecution.runId);
    }
  }

  loadTestResults(runId?: number): void {
    this.isLoading = true;
    this.error = null;

    if (!this.currentExecution?.projectName || !runId) {
      this.error = 'No pipeline execution available. Please run the pipeline first.';
      this.isLoading = false;
      return;
    }

    this.testResultsService.getTestResults(runId, this.currentExecution.projectName)
      .pipe(
        map((results: TestStepResult[]) => {
          this.testResultsStateService.updateTestResults(
            results,
            runId,
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
            duration: 0,
            timestamp: this.timeDisplay.currentDateTime,
            runId: runId
          }));
        }),
        catchError(error => {
          console.error('Error loading test results:', error);
          this.handleTestResultsError(error);
          return of([]);
        })
      )
      .subscribe({
        next: (results: TestResult[]) => {
          this.handleTestResults(results);
          this.isLoading = false;
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
      this.error = 'No test results available.';
      return;
    }

    this.allTestResults = results;
    this.dataSource.data = results; // Set full dataset, let paginator handle slicing
    this.updateTestCounts(results);

    if (this.paginator) {
      this.paginator.length = results.length; // Set total length
      this.paginator.firstPage(); // Ensure start on first page
    }
  }

  private updateTestCounts(results: TestResult[]): void {
    this.totalPassedCount = results.filter(r => r.status === 'PASSED').length;
    this.totalFailedCount = results.filter(r => r.status === 'FAILED').length;
    this.totalTestCount = results.length;
  }

  private handleTestResultsError(error: any): void {
    if (error.message.includes('Pipeline execution for build 0 not found')) {
      this.statusMessage = 'Waiting for pipeline execution to complete...';
    } else {
      this.statusMessage = `Error loading test results: ${error.message}`;
    }
    this.isLoading = false;
  }

  private updateTestResultsDisplay(results: TestResult[] | TestResultsSummary): void {
    if (Array.isArray(results)) {
      this.handleTestResults(results);
      return;
    }

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
      timestamp: this.timeDisplay.currentDateTime,
      runId: results.runId
    } as TestResult));

    this.handleTestResults(mappedResults);
    this.passedTestsCount = results.passedSteps;
    this.failedTestsCount = results.failedSteps;
    this.totalTestsCount = results.totalSteps;
    this.totalPassedCount = this.passedTestsCount;
    this.totalFailedCount = this.failedTestsCount;
    this.totalTestCount = this.totalTestsCount;

  }



  navigateToAzureDevOps(): void {
    this.router.navigate(['/app/dashboard/azure-devops'], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  

  filterByStatus(status: string): void {
    this.statusFilter = status;
    let filteredData = this.allTestResults;
    
    if (status !== 'ALL') {
      filteredData = this.allTestResults.filter(result => result.status === status);
    }
    
    this.dataSource.data = filteredData; 
    
    if (this.paginator) {
      this.paginator.length = filteredData.length;
      this.paginator.firstPage(); 
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
    
    if (this.paginator) {
      this.paginator.length = this.dataSource.data.length; 
      this.paginator.firstPage(); 
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
      Time: ${result.timestamp}
    `;
    alert(details);
  }
}