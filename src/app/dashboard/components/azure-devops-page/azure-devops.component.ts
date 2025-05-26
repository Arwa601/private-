import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
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

import { TestResultsApiService, PipelineExecutionResponse } from '../../services/test-results-api.service';
import { TestStepResult } from '../../models/test-results-data';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../../services/Azure/azure-devops.service';

@Component({
  selector: 'app-simple-pipeline-selector',
  templateUrl: './simple-pipeline-selector.html',
  styleUrls: ['./azure-devops.component.scss'],
  standalone: true,    imports: [
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
    MatNativeDateModule
  ]
})
export class AzureDevopsComponent implements OnInit {
  @Output() runPipeline = new EventEmitter<{projectId: string, pipelineId: number, response: PipelineExecutionResponse}>();
  
  // Status and results
  pipelineStatus = new BehaviorSubject<{isRunning: boolean, progress?: number, currentStage?: string}>({isRunning: false});
  statusMessage = '';
  currentTestResults: {
    passedCount: number;
    failedCount: number;
    skippedCount: number;
    totalCount: number;
    details: TestStepResult[];
  } | null = null;

  // Project and pipeline data
  azureProjects: AzureProject[] = [];
  selectedProject: AzureProject | null = null;
  selectedPipeline: AzurePipeline | null = null;
  selectedProjectPipelines: { [key: string]: AzurePipeline[] } = {};

  // Form related
  schedulePipelineForm: FormGroup;
  isScheduleEnabled: boolean = false;

  // Current execution tracking
  currentExecution: {
    projectName: string;
    pipelineId: number;
    runId: number;
  } | null = null;
  debugMode: any;
  toastr: any;

  constructor(
    private testResultsApiService: TestResultsApiService,
    private AzureDevOpsService:AzureDevOpsService,
    private formBuilder: FormBuilder
  ) {
    // Initialize form
    this.schedulePipelineForm = this.formBuilder.group({
      scheduleEnabled: [false],
      scheduledDate: [{ value: '', disabled: true }, Validators.required],
      scheduledTime: [{ value: '', disabled: true }, Validators.required]
    });

    // Watch schedule enabled changes
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
        }    try {
          const rawPipelines = await lastValueFrom(this.AzureDevOpsService.getPipelines(project.Name)) as AzurePipeline[];
          if (this.debugMode) {
            console.log('[Debug] Raw pipelines data:', rawPipelines);
          }
    
          this.selectedProjectPipelines[projectId] = rawPipelines.map((p: AzurePipeline) => ({
            Id: p.Id,
            Name: p.Name || 'Unnamed Pipeline'
          })) || [];
          if (this.debugMode) {
            console.log('[Debug] Loaded pipelines for projectId:', projectId, this.selectedProjectPipelines[projectId]);
            console.log('[Debug] Pipeline IDs (mapped):', this.selectedProjectPipelines[projectId]?.map(p => p.Id));
            console.log('[Debug] Pipeline objects:', this.selectedProjectPipelines[projectId]);
          }    } catch (error: any) {
          console.error('Error loading pipelines:', error);
          this.toastr.error('Failed to load pipelines. Please try again.');
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
      this.pipelineStatus.next({
        isRunning: true,
        progress: 0,
        currentStage: 'Initiating pipeline...'
      });

      this.statusMessage = 'Triggering pipeline...';
      const projectName = this.selectedProject?.Name || '';
      const pipelineId = this.selectedPipeline?.Id || 0;
      
      this.testResultsApiService.triggerPipeline(projectName, pipelineId)
        .subscribe({
          next: (response: PipelineExecutionResponse) => {
            this.statusMessage = `Pipeline triggered successfully! Run ID: ${response.runId}`;
            
            this.currentExecution = {
              projectName: projectName,
              pipelineId: pipelineId,
              runId: response.runId
            };
            
            // Update status based on trigger response
            this.updatePipelineStatus(response);
            
            // Emit event so parent components can react
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
          }
        });
    }
  }
  /**
   * Tracks the pipeline execution progress until completion
   * @param projectName The project name
   * @param pipelineId The pipeline ID
   * @param runId The run ID of the pipeline execution
   */
   private updatePipelineStatus(response: PipelineExecutionResponse): void {
    const state = response.State?.toLowerCase();
    let progress = 25; // Default progress value
    
    if (state === 'completed') {
      progress = 100;
      const resultMessage = response.Result?.toLowerCase() === 'succeeded' 
        ? 'Successfully completed!' 
        : `Completed with status: ${response.Result}`;
      
      this.statusMessage = `Pipeline execution ${resultMessage}`;
      
      if (response.Result?.toLowerCase() === 'succeeded') {
        this.notifyTestResultsAvailable(response.runId);
      }
    }
    
    this.pipelineStatus.next({
      isRunning: state !== 'completed',
      progress: progress,
      currentStage: state || 'Unknown'
    });
  }

  /**
   * Shows a notification that test results are available
   * @param runId The run ID to use as build_id for test results
   */
  private notifyTestResultsAvailable(runId: number): void {
    this.statusMessage = 'Test results are ready! You can view them in the dashboard or download the HTML report.';
    
    this.pipelineStatus.next({
      isRunning: false,
      progress: 100,
      currentStage: 'Ready'
    });
    
    // Store the build_id/runId in the current execution for later use
    if (this.currentExecution) {
      this.currentExecution.runId = runId;
    }
  }

  /**
   * Downloads the HTML report for the current execution
   */
  downloadHtmlReport(error?: Error): void {
    if (!this.currentExecution) {
      return;
    }
    
    this.testResultsApiService.downloadHtmlReport(
      this.currentExecution.projectName, 
      this.currentExecution.pipelineId, 
      this.currentExecution.runId
    ).subscribe({
      next: (blob) => {
        // Create a URL for the blob and trigger a download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${this.currentExecution?.runId}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading HTML report:', err);
        this.statusMessage = `Failed to download report: ${err.message}`;
      }
    });
  }

  /**
   * Refreshes the test results for the current execution
   */
  refreshTestResults(): void {
    if (!this.currentExecution) {
      return;
    }
    
    this.statusMessage = 'Refreshing test results...';
    this.testResultsApiService.getTestResults(this.currentExecution.runId, this.currentExecution.projectName)
      .subscribe({
        next: (results) => {          if (results && results.length > 0) {
            // Calculate summary counts - status is lowercase in the API
            const passedCount = results.filter(r => r.status === 'passed').length;
            const failedCount = results.filter(r => r.status === 'failed').length;
            const skippedCount = results.filter(r => r.status === 'skipped').length;
            
            this.currentTestResults = {
              passedCount,
              failedCount,
              skippedCount,
              totalCount: results.length,
              details: results
            };
            
            this.statusMessage = `Test results refreshed: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped.`;
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
  /**
   * Returns the CSS class for a test row based on its status
   */
  getTestRowClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'passed': return 'table-success';
      case 'failed': return 'table-danger';
      case 'skipped': return 'table-warning';
      default: return '';
    }
  }

  /**
   * Returns the CSS class for a test status badge
   */
  getTestStatusBadgeClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'passed': return 'badge bg-success';
      case 'failed': return 'badge bg-danger';
      case 'skipped': return 'badge bg-warning text-dark';
      default: return 'badge bg-secondary';
    }
  }
}