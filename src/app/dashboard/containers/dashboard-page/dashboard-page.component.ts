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
export class DashboardPageComponent implements OnInit, AfterViewInit {
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
    skippedCount: number;
    totalCount: number;
    details: TestStepResult[];
  } | null = null;

  // Default project configuration
  defaultProject = 'APIsTestAutomation';
  defaultPipelineId = 1;
  
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

    this.pipelineStatus.next({
      isRunning: true,
      progress: 0,
      currentStage: 'Initiating pipeline...'
    });

    this.testResultsService.triggerPipeline(projectName, pipelineId)
      .subscribe({
        next: (response: PipelineExecutionResponse) => {
          if (response.State.toLowerCase() === 'completed') {
            this.testResultsService.getTestResults(response.runId, projectName)
              .subscribe({
                next: (testResults: TestStepResult[]) => {
                  const passedCount = testResults.filter((r: TestStepResult) => r.status.toLowerCase() === 'passed').length;
                  const failedCount = testResults.filter((r: TestStepResult) => r.status.toLowerCase() === 'failed').length;
                  const skippedCount = testResults.filter((r: TestStepResult) => r.status.toLowerCase() === 'skipped').length;

                  this.currentTestResults = {
                    passedCount,
                    failedCount,
                    skippedCount,
                    totalCount: testResults.length,
                    details: testResults
                  };

                  this.statusMessage = `Pipeline completed successfully! Test results: 
                    ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped.`;
                },
                error: (error: Error) => {
                  console.error('Error loading test results:', error);
                  this.statusMessage = `Failed to load test results: ${error.message}`;
                }
              });
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
    this.isLoading = true;
    this.error = null;
    this.testResultsService.getTestResults(runId || 0, this.defaultProject)
      .pipe(
        map(results => results.map(result => ({
          id: result.runId?.toString() || '0',
          reportId: result.runId?.toString() || '0',
          feature: result.featureName,
          scenario: result.scenario,
          status: result.status,
          stepName: result.stepName,
          exceptionType: result.exceptionType,
          exceptionMessage: result.exceptionMessage
        } as TestResult))),
        catchError(error => {
          this.error = 'Failed to load test results. Please try again later.';
          console.error('Error loading test results:', error);
          return of([]);
        })
      )
      .subscribe(results => {
        this.dataSource.data = results;
        this.passedTestsCount = results.filter(r => r.status === 'PASSED').length;
        this.failedTestsCount = results.filter(r => r.status === 'FAILED').length;
        this.totalTestsCount = results.length;
        this.isLoading = false;
      });
  }

  private originalFilterPredicate = (data: TestResult, filter: string): boolean => {
    const filterText = filter.toLowerCase();
    return data.feature.toLowerCase().includes(filterText) ||
           data.scenario.toLowerCase().includes(filterText) ||
           data.status.toLowerCase().includes(filterText) ||
           (data.exceptionType?.toLowerCase().includes(filterText) || false) ||
           (data.exceptionMessage?.toLowerCase().includes(filterText) || false);
  };
  
  applyFilter(event: Event): void {
    this.dataSource.filterPredicate = this.originalFilterPredicate;
    this.statusFilter = 'ALL';
    
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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