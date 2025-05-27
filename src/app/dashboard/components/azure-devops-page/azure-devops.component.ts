import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, lastValueFrom, Subscription } from 'rxjs';
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
import { switchMap } from 'rxjs/operators';

import { TestResultsApiService, PipelineExecutionResponse } from '../../services/test-results-api.service';
import { TestStepResult } from '../../models/test-results-data';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../../services/Azure/azure-devops.service';
import { PipelineStorageService, PipelineExecution } from '../../services/pipeline-storage.service';
import { PipelineStatusService } from '../../services/pipeline-status.service';


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

  schedulePipelineForm: FormGroup;
  isScheduleEnabled: boolean = false;

  currentExecution: {
    projectName: string;
    pipelineId: number;
    runId: number;
  } | null = null;
  debugMode: boolean = false;

  private statusPolling?: Subscription;

  constructor(
    private testResultsApiService: TestResultsApiService,
    private AzureDevOpsService: AzureDevOpsService,
    private formBuilder: FormBuilder,
    private pipelineStorageService: PipelineStorageService,
    private pipelineStatusService: PipelineStatusService,
    private domSanitizer: DomSanitizer
  ) {
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

  ngOnInit(): void {
    this.loadProjects();

    const savedExecution = this.pipelineStorageService.getExecution();
    if (savedExecution) {
      this.currentExecution = {
        projectName: savedExecution.projectName,
        pipelineId: savedExecution.pipelineId,
        runId: savedExecution.runId
      };
      this.pipelineStatus.next(savedExecution.status);
      if (savedExecution.runId > 0) {
        this.loadTestResults(savedExecution.runId);
      }
    }
  }

  ngOnDestroy() {
    this.stopStatusPolling();
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

  onPipelineSelectForRunner(event: Event): void {
    const pipelineId = +(event.target as HTMLSelectElement).value;
    if (this.selectedProject) {
      const pipelines = this.selectedProjectPipelines[this.selectedProject.Id] || [];
      this.selectedPipeline = pipelines.find(p => p.Id === pipelineId) || null;
    }
  }

  triggerPipeline(): void {
    if (!this.selectedProject || !this.selectedPipeline) {
      return;
    }

    if (this.isScheduleEnabled) {
      const scheduledDate = this.schedulePipelineForm.get('scheduledDate')?.value;
      const scheduledTime = this.schedulePipelineForm.get('scheduledTime')?.value;

      if (!scheduledDate || !scheduledTime) {
        return;
      }

      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      this.statusMessage = 'Scheduling pipeline...';
      this.testResultsApiService.triggerPipeline(
        this.selectedProject.Name,
        this.selectedPipeline.Id,
        scheduledDateTime
      ).subscribe({
        next: (response) => {
          this.statusMessage = `Pipeline scheduled for ${scheduledDateTime.toLocaleString()}`;
          this.updatePipelineStatus(response);
        },
        error: (error: Error) => {
          console.error('Error scheduling pipeline:', error);
          this.statusMessage = `Failed to schedule pipeline: ${error.message}`;
        }
      });
    } else {
      const execution: PipelineExecution = {
        projectName: this.selectedProject.Name,
        pipelineId: this.selectedPipeline.Id,
        runId: 0,
        status: {
          isRunning: true,
          progress: 0,
          currentStage: 'Initiating pipeline...'
        }
      };

      this.currentExecution = {
        projectName: execution.projectName,
        pipelineId: execution.pipelineId,
        runId: execution.runId
      };

      this.pipelineStatus.next(execution.status);
      this.pipelineStorageService.saveExecution(execution);

      this.statusMessage = 'Triggering pipeline...';
      const projectName = this.selectedProject?.Name || '';
      const pipelineId = this.selectedPipeline?.Id || 0;

      this.testResultsApiService.triggerPipeline(projectName, pipelineId)
        .subscribe({
          next: (response: PipelineExecutionResponse) => {
            this.statusMessage = `Pipeline triggered successfully! Run ID: ${response.RunId}`;

            this.currentExecution = {
              projectName: projectName,
              pipelineId: pipelineId,
              runId: response.RunId
            };

            this.updatePipelineStatus(response);

            if (this.selectedProject) {
              this.runPipeline.emit({
                projectId: this.selectedProject.Id,
                pipelineId: pipelineId,
                response: response
              });
            }
          },
          error: (error: Error) => {
            console.error('Error triggering pipeline:', error);
            this.statusMessage = `Failed to trigger pipeline: ${error.message}`;
            this.pipelineStatus.next({isRunning: false});
            this.pipelineStorageService.clearExecution();
          }
        });
    }
  }

  private loadTestResults(runId: number): void {
    if (!this.currentExecution?.projectName || runId === 0) {
      this.statusMessage = 'Waiting for pipeline execution to start...';
      return;
    }
    
    this.testResultsApiService.getTestResults(runId, this.currentExecution.projectName)
      .subscribe({
        next: (results) => {
          if (!results || results.length === 0) {
            this.statusMessage = 'No test results available yet.';
            return;
          }

          this.currentTestResults = {
            passedCount: results.filter(r => r.Status === 'PASSED').length,
            failedCount: results.filter(r => r.Status === 'FAILED').length,
            totalCount: results.length,
            details: results
          };

          const failedTests = results.filter(r => r.Status === 'FAILED');
          this.statusMessage = `Test results loaded: ${this.currentTestResults.passedCount} passed, ${this.currentTestResults.failedCount} failed.`;
          
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
        },
        error: (error) => {
          console.error('Error loading test results:', error);
          if (error.message.includes('Pipeline execution for build 0 not found')) {
            this.statusMessage = 'Waiting for pipeline execution to complete...';
          } else {
            this.statusMessage = `Error loading test results: ${error.message}`;
          }
        }
      });
  }

  refreshTestResults(): void {
    if (!this.currentExecution) {
      return;
    }

    this.statusMessage = 'Refreshing test results...';
    this.testResultsApiService.getTestResults(this.currentExecution.runId, this.currentExecution.projectName)
      .subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            this.currentTestResults = {
              passedCount: results.filter(r => r.Status === 'PASSED').length,
              failedCount: results.filter(r => r.Status === 'FAILED').length,
              totalCount: results.length,
              details: results
            };

            const failedTests = results.filter(r => r.Status === 'FAILED');
            if (failedTests.length > 0) {
              this.statusMessage = `Test results refreshed: ${this.currentTestResults.passedCount} passed\n`;
              this.statusMessage += 'Failed tests:\n';
              failedTests.forEach(test => {
                if (test.Scenario) {
                  this.statusMessage += `- ${test.Feature}: ${test.Scenario}\n`;
                  if (test.ExceptionMessage) {
                    this.statusMessage += `  Error: ${test.ExceptionMessage}\n`;
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
        error: (error) => {
          console.error('Error refreshing test results:', error);
          this.statusMessage = `Failed to refresh test results: ${error.message}`;
        }
      });
  }

  private updatePipelineStatus(response: PipelineExecutionResponse): void {
    if (response.State === 'completed') {
      if (response.Result === 'succeeded') {
        this.statusMessage = 'Pipeline execution completed successfully!';
        this.loadTestResults(response.RunId);
      } else {
        this.handleFailedPipeline(response);
      }

      this.pipelineStatus.next({
        isRunning: false,
        progress: 100,
        currentStage: 'Completed'
      });
    } else {
      this.pipelineStatus.next({
        isRunning: true,
        progress: 50,
        currentStage: response.State
      });
    }

    if (this.currentExecution) {
      this.pipelineStorageService.saveExecution({
        ...this.currentExecution,
        status: this.pipelineStatus.value
      });
    }
  }

   private handleFailedPipeline(response: PipelineExecutionResponse) {
    this.statusMessage = `Pipeline execution failed with status: ${response.Result}`;
    if (this.currentExecution) {
      const pipelineUrl = this.getPipelineUrl(
        this.currentExecution.projectName, 
        this.currentExecution.pipelineId
      );
      this.statusMessage += ` <a href="${pipelineUrl}" target="_blank">View in Azure DevOps</a>`;
    }
  }

  private getPipelineUrl(projectName: string, pipelineId: number): string {
    return `https://dev.azure.com/${projectName}/_build?definitionId=${pipelineId}`;
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
        url.searchParams.set('$format', 'zip');
        return this.testResultsApiService.downloadFromAzureDevOps(url.toString());
      })
    ).subscribe({
      next: (result: DownloadResult) => {
        if (result.type === 'auth') {
          const downloadUrl = result.data as string;
          const safeUrl = this.domSanitizer.bypassSecurityTrustUrl(downloadUrl);
          
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
        a.download = `test-report-${this.currentExecution?.runId}.zip`;
        
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

  private stopStatusPolling() {
    if (this.statusPolling) {
      this.statusPolling.unsubscribe();
      this.statusPolling = undefined;
    }
  }
}