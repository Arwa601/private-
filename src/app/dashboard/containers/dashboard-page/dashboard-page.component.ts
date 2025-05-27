import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { TestResultsApiService } from '../../services/test-results-api.service';
import { TestStepResult } from '../../models/test-results-data';
import { PipelineStorageService, PipelineExecution } from '../../services/pipeline-storage.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['feature', 'scenario', 'status', 'exceptionType'];
  dataSource: MatTableDataSource<TestStepResult>;
  isLoading = false;
  error: string | null = null;
  statusFilter: 'ALL' | 'PASSED' | 'FAILED' = 'ALL';

  passedTestsCount = 0;
  failedTestsCount = 0;
  totalTestsCount = 0;

  currentExecution: PipelineExecution | null = null;
  currentDate: Date = new Date('2025-05-27T15:15:24Z');
  currentUser: string = 'Arwa601';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private testResultsApiService: TestResultsApiService,
    private pipelineStorageService: PipelineStorageService
  ) {
    this.dataSource = new MatTableDataSource<TestStepResult>([]);
    // Update current date every minute
    setInterval(() => {
      this.currentDate = new Date();
    }, 60000);
  }

  ngOnInit() {
    this.currentExecution = this.pipelineStorageService.getExecution();
    if (this.currentExecution?.runId) {
      this.loadTestResults(this.currentExecution.runId);
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'status': return item.Status;
        case 'feature': return item.Feature;
        case 'scenario': return item.Scenario;
        case 'exceptionType': return item.ExceptionType || '';
        default: return (item as any)[property];
      }
    };
  }

  loadTestResults(runId?: number) {
    this.isLoading = true;
    this.error = null;

    if (!this.currentExecution?.projectName || !runId) {
      this.error = 'No pipeline execution available. Please run the pipeline first.';
      this.isLoading = false;
      return;
    }

    this.testResultsApiService.getTestResults(runId, this.currentExecution.projectName)
      .subscribe({
        next: (results) => {
          this.dataSource.data = results;
          this.updateTestCounts(results);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading test results:', error);
          if (error.message.includes('Pipeline execution for build 0 not found')) {
            this.error = 'Waiting for pipeline execution to complete...';
          } else {
            this.error = `Error loading test results: ${error.message}`;
          }
          this.isLoading = false;
        }
      });
  }

  private updateTestCounts(results: TestStepResult[]) {
    this.passedTestsCount = results.filter(r => r.Status === 'PASSED').length;
    this.failedTestsCount = results.filter(r => r.Status === 'FAILED').length;
    this.totalTestsCount = results.length;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filterByStatus(status: 'ALL' | 'PASSED' | 'FAILED') {
    this.statusFilter = status;
    this.dataSource.filterPredicate = (data: TestStepResult, filter: string) => {
      if (filter === 'ALL') return true;
      return data.Status === filter;
    };
    this.dataSource.filter = status;

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getStatusClass(status: string): string {
    return {
      'PASSED': 'status-passed',
      'FAILED': 'status-failed',
      'SKIPPED': 'status-skipped'
    }[status] || '';
  }

  refreshResults() {
    if (this.currentExecution?.runId) {
      this.loadTestResults(this.currentExecution.runId);
    }
  }

  triggerPipeline() {
    if (!this.currentExecution) {
      this.error = 'No pipeline configuration found.';
      return;
    }

    this.isLoading = true;
    this.testResultsApiService.triggerPipeline(
      this.currentExecution.projectName,
      this.currentExecution.pipelineId
    ).subscribe({
      next: (response) => {
        this.currentExecution = {
          ...this.currentExecution!,
          runId: response.RunId,
          status: {
            isRunning: true,
            progress: 0,
            currentStage: 'Initiating pipeline...'
          }
        };
        this.pipelineStorageService.saveExecution(this.currentExecution);
        this.loadTestResults(response.RunId);
      },
      error: (error) => {
        console.error('Error triggering pipeline:', error);
        this.error = `Failed to trigger pipeline: ${error.message}`;
        this.isLoading = false;
      }
    });
  }
}