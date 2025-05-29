import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, lastValueFrom, Subscription, EMPTY } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Subject } from 'rxjs';

import { TestResultsApiService, PipelineExecutionResponse } from '../../services/test-results-api.service';
import { TestStepResult } from '../../models/test-results-data';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../../services/Azure/azure-devops.service';
import { PipelineStorageService, PipelineExecution } from '../../services/pipeline-storage.service';

interface DownloadResult {
  type: 'blob' | 'auth';
  data: Blob | string;
}

@Component({
  selector: 'app-simple-pipeline-selector',
  templateUrl: './simple-pipeline-selector.html',
  styleUrls: ['./azure-devops.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
  ]
})
export class AzureDevopsComponent implements OnInit, OnDestroy {
  @Output() runPipeline = new EventEmitter<{projectId: string, pipelineId: number, response: PipelineExecutionResponse}>();

  private destroy$ = new Subject<void>();

  pipelineStatus = new BehaviorSubject<{isRunning: boolean, progress?: number, currentStage?: string}>({isRunning: false});
  statusMessage = '';
  currentTestResults: {
    passedCount: number;
    failedCount: number;
    totalCount: number;
    details: TestStepResult[];
  } | null = null;

  azureProjects: AzureProject[] = [];
  selectedProject: AzureProject | null = null;
  selectedPipeline: AzurePipeline | null = null;
  selectedProjectPipelines: { [key: string]: AzurePipeline[] } = {};

  schedulePipelineForm!: FormGroup;
  isScheduleEnabled: boolean = false;

  currentExecution: {
    projectName: string;
    pipelineId: number;
    pipelineName: string;
    runId: number;
  } | null = null;

  debugMode: boolean = false;

  constructor(
    private testResultsApiService: TestResultsApiService,
    private AzureDevOpsService: AzureDevOpsService,
    private formBuilder: FormBuilder,
    private pipelineStorageService: PipelineStorageService,
    private domSanitizer: DomSanitizer
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.schedulePipelineForm = this.formBuilder.group({
      scheduleEnabled: [false],
      scheduledDate: [{ value: '', disabled: true }, Validators.required],
      scheduledTime: [{ value: '', disabled: true }, Validators.required]
    });

    this.schedulePipelineForm.get('scheduleEnabled')?.valueChanges.subscribe(enabled => {
      this.isScheduleEnabled = enabled;
      const dateControl = this.schedulePipelineForm.get('scheduledDate');
      const timeControl = this.schedulePipelineForm.get('scheduledTime');
      if (enabled) {
        dateControl?.enable();
        timeControl?.enable();
      } else {
        dateControl?.disable();
        timeControl?.disable();
      }
    });
  }

  private getCurrentExecution(): { projectName: string; pipelineId: number; pipelineName: string; runId: number } | null {
    if (!this.currentExecution) {
      this.handleTestResultsError(new Error('No execution context available'));
      return null;
    }
    return this.currentExecution;
  }

  refreshTestResults(): void {
    const currentExec = this.getCurrentExecution();
    if (!currentExec) {
      this.statusMessage = 'No pipeline execution available to refresh results.';
      return;
    }

    this.loadTestResults(currentExec.runId);
  }

  ngOnInit(): void {
    this.loadProjects();

    const savedExecution = this.pipelineStorageService.getExecution();
    if (savedExecution) {
      this.currentExecution = {
        projectName: savedExecution.projectName,
        pipelineId: savedExecution.pipelineId,
        pipelineName: savedExecution.pipelineName || '',
        runId: savedExecution.runId
      };
      this.pipelineStatus.next(savedExecution.status);
      if (savedExecution.runId > 0) {
        this.loadTestResults(savedExecution.runId);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.AzureDevOpsService.getProjects().subscribe({
      next: (projects: AzureProject[]) => {
        this.azureProjects = projects;
      },
      error: (error: Error) => {
        console.error('Error loading Azure DevOps projects:', error);
        this.statusMessage = `Failed to load projects: ${error.message}`;
      }
    });
  }

  onProjectSelect(event: Event): void {
    const projectId = (event.target as HTMLSelectElement).value;
    const selectedProject = this.azureProjects.find(p => p.Id === projectId);

    if (selectedProject) {
      this.selectedProject = selectedProject;
      this.selectedPipeline = null;
      this.loadPipelinesForProject(projectId);
    } else {
      this.selectedProject = null;
      this.selectedProjectPipelines = {};
    }
  }

  triggerPipeline(): void {
    if (!this.selectedProject || !this.selectedPipeline) {
      return;
    }

    const projectName = this.selectedProject.Name;
    const pipelineId = this.selectedPipeline.Id;
    const pipelineName = this.selectedPipeline.Name;

    this.currentExecution = {
      projectName,
      pipelineId,
      pipelineName,
      runId: 0
    };

    if (this.isScheduleEnabled) {
      const scheduledDate = this.schedulePipelineForm.get('scheduledDate')?.value;
      const scheduledTime = this.schedulePipelineForm.get('scheduledTime')?.value;
      if (scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const delay = scheduledDateTime.getTime() - now.getTime();

        if (delay <= 0) {
          this.statusMessage = 'Scheduled time is in the past. Triggering pipeline immediately.';
        } else {
          this.statusMessage = `Pipeline scheduled for ${scheduledDateTime.toLocaleString()}.`;
          setTimeout(() => {
            this.executePipeline(projectName, pipelineId);
          }, delay);
          return;
        }
      }
    }

    this.executePipeline(projectName, pipelineId);
  }

  private executePipeline(projectName: string, pipelineId: number): void {
    this.pipelineStatus.next({
      isRunning: true,
      currentStage: 'triggering pipeline...'
    });

    this.pipelineStorageService.saveExecution({
      projectName,
      pipelineId,
      pipelineName: this.currentExecution?.pipelineName || '', // Fixed shorthand property
      runId: 0,
      status: { isRunning: true, currentStage: 'triggering pipeline...' }
    });

    this.testResultsApiService.triggerPipeline(projectName, pipelineId)
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
    pipelineId: number,
  ): void {
    this.statusMessage = `Pipeline triggered. Current state: ${response.State}`;
    const pipelineUrl = this.testResultsApiService.getPipelineUrl(projectName, pipelineId);
    this.statusMessage += ` <br>Check the pipeline logs for more details: <a href="${pipelineUrl}" target="_blank">View Pipeline Details</a>`;

    if (this.currentExecution) {
      this.currentExecution.runId = response.RunId;
      this.pipelineStorageService.saveExecution({
        projectName,
        pipelineId,
        pipelineName: this.currentExecution.pipelineName,
        runId: response.RunId,
        status: { isRunning: response.State.toLowerCase() !== 'completed', progress: 100, currentStage: response.State }
      });
    }

    this.pipelineStatus.next({
      isRunning: response.State.toLowerCase() !== 'completed',
      progress: response.State.toLowerCase() === 'completed' ? 100 : 10,
      currentStage: response.State
    });

    if (response.State.toLowerCase() === 'completed' && response.RunId > 0) {
      this.loadTestResults(response.RunId);
    }
  }

  private handlePipelineError(error: Error): void {
    console.error('Pipeline trigger error:', error);
    this.statusMessage = `Failed to trigger pipeline: ${error.message}`;
    if (this.currentExecution) {
      this.pipelineStorageService.saveExecution({
        projectName: this.currentExecution.projectName,
        pipelineId: this.currentExecution.pipelineId,
        pipelineName: this.currentExecution.pipelineName,
        runId: this.currentExecution.runId,
        status: { isRunning: false, progress: 0, currentStage: 'Error' }
      });
    }
    this.pipelineStatus.next({
      isRunning: false,
      progress: 0,
      currentStage: 'Error'
    });
  }

  onPipelineSelectForRunner(event: Event): void {
    const pipelineId = +(event.target as HTMLSelectElement).value;
    if (this.selectedProject) {
      const pipelines = this.selectedProjectPipelines[this.selectedProject.Id] || [];
      this.selectedPipeline = pipelines.find(p => p.Id === pipelineId) || null;
    }
  }

  private async loadPipelinesForProject(projectId: string): Promise<void> {
    if (!projectId) {
      console.error('Project ID is undefined or empty');
      return;
    }

    const project = this.azureProjects.find(p => p.Id === projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return;
    }

    try {
      const rawPipelines = await lastValueFrom(this.AzureDevOpsService.getPipelines(project.Name)) as AzurePipeline[];
      this.selectedProjectPipelines[projectId] = rawPipelines.map((p: AzurePipeline) => ({
        Id: p.Id,
        Name: p.Name || 'Unnamed Pipeline'
      })) || [];
    } catch (error: any) {
      console.error('Error loading pipelines:', error);
      this.statusMessage = 'Failed to load pipelines. Please try again.';
      this.selectedProjectPipelines[projectId] = [];
    }
  }

  private loadTestResults(runId: number): void {
    if (!this.currentExecution) return;

    this.testResultsApiService.getTestResults(runId, this.currentExecution.projectName)
      .subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            this.updateTestResults(results);
          }
        },
        error: (error) => {
          console.error('Error loading test results:', error);
          this.handleTestResultsError(error);
        }
      });
  }

  private updateTestResults(results: TestStepResult[]): void {
    this.currentTestResults = {
      passedCount: results.filter(r => r.Status === 'PASSED').length,
      failedCount: results.filter(r => r.Status === 'FAILED').length,
      totalCount: results.length,
      details: results
    };

    this.updateStatusMessage();
  }

  private updateStatusMessage(): void {
    if (!this.currentTestResults) return;

    this.statusMessage = `Test results updated: ${this.currentTestResults.passedCount} passed, ${this.currentTestResults.failedCount} failed.`;
    
    const failedTests = this.currentTestResults.details.filter(r => r.Status === 'FAILED');
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

  downloadHtmlReport(): void {
    if (!this.currentExecution || this.currentExecution.runId === 0) {
      this.statusMessage = 'No pipeline execution available to download report.';
      return;
    }

    this.statusMessage = 'Retrieving report download URL...';
    this.testResultsApiService.downloadHtmlReport(
      this.currentExecution.projectName, 
      this.currentExecution.pipelineId, 
      this.currentExecution.runId
    ).pipe(
      switchMap(downloadUrl => {
        this.statusMessage = 'Downloading report...';
        const url = new URL(downloadUrl);
        url.searchParams.set('$format', 'Zip');
        return this.testResultsApiService.downloadFromAzureDevOps(url.toString());
      })
    ).subscribe({
      next: (result: DownloadResult) => {
        if (result.type === 'auth') {
          const downloadUrl = result.data as string;
          this.statusMessage = `Authentication required. Please <a href="${downloadUrl}" target="_blank">login to Azure DevOps</a> first, then try downloading again.`;
          
          if (typeof result.data === 'string') {
            window.open(result.data, '_blank');
          }
          return;
        }

        const blob = result.data as Blob;
        if (blob.size === 0) {
          this.statusMessage = 'Error: Empty file received';
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${this.currentExecution?.runId}.Zip`;
        
        try {
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.statusMessage = 'Report downloaded successfully.';
        } catch (error) {
          console.error('Error during file download:', error);
          this.statusMessage = 'Error occurred while downloading the file.';
        }
      },
      error: (err) => {
        console.error('Error downloading HTML report:', err);
        
        if (err.type === 'auth') {
          const authUrl = err.data as string;
          this.statusMessage = `Authentication required. Please <a href="${authUrl}" target="_blank">login to Azure DevOps</a> first, then try downloading again.`;
        } else {
          this.statusMessage = `Failed to download report: ${err.message}. Please try again later.`;
        }
      }
    });
  }

  private handleTestResultsError(error: any): void {
    if (error.message.includes('Pipeline execution for build 0 not found')) {
      this.statusMessage = 'Waiting for pipeline execution to complete...';
    } else {
      this.statusMessage = `Error loading test results: ${error.message}`;
    }
  }

  clearLocalState(): void {
    this.pipelineStorageService.clearExecution();
    this.currentExecution = null;
    this.pipelineStatus.next({ isRunning: false, progress: 0, currentStage: '' });
    this.statusMessage = 'Local state cleared. You can now trigger a new pipeline.';
    this.currentTestResults = null;
    this.loadProjects();
  }

  getTestRowClass(status: string): string {
    switch (status) {
      case 'PASSED': return 'table-success';
      case 'FAILED': return 'table-danger';
      case 'SKIPPED': return 'table-warning';
      default: return '';
    }
  }

  getTestStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PASSED': return 'badge bg-success';
      case 'FAILED': return 'badge bg-danger';
      case 'SKIPPED': return 'badge bg-warning text-dark';
      default: return 'badge bg-secondary';
    }
  }
}