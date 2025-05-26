import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../services/Azure/azure-devops.service';
import { TestResultsApiService } from '../../dashboard/services/test-results-api.service';

@Component({
  selector: 'app-pipeline-runner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Run Azure DevOps Pipeline</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="pipeline-controls">
          <!-- Project Selection -->
          <mat-form-field appearance="outline">
            <mat-label>Select Project</mat-label>
            <mat-select [(ngModel)]="selectedProject" (selectionChange)="onProjectSelect($event.value)">
              <mat-option *ngFor="let project of projects" [value]="project.Name">
                {{project.Name}}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Pipeline Selection -->
          <mat-form-field appearance="outline">
            <mat-label>Select Pipeline</mat-label>
            <mat-select [(ngModel)]="selectedPipelineId" [disabled]="!selectedProject || pipelines.length === 0">
              <mat-option *ngFor="let pipeline of pipelines" [value]="pipeline.Id">
                {{pipeline.Name}} (ID: {{pipeline.Id}})
              </mat-option>
            </mat-select>
            <mat-hint *ngIf="pipelines.length === 0 && selectedProject && !isLoading">No pipelines available</mat-hint>
          </mat-form-field>
        </div>

        <!-- Debug Info -->
        <div *ngIf="debugMode" class="debug-info">
          <mat-divider></mat-divider>
          <h4>Debug Information</h4>
          <p>Selected Project: {{ selectedProject || 'none' }}</p>
          <p>Selected Pipeline ID: {{ selectedPipelineId || 'none' }}</p>
          <p>Projects count: {{ projects.length }}</p>
          <p>Pipelines count: {{ pipelines.length }}</p>
          
          <details>
            <summary>Pipeline Data (click to expand)</summary>
            <pre>{{ pipelines | json }}</pre>
          </details>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            mat-raised-button 
            color="accent" 
            [disabled]="isLoading || !selectedProject || !selectedPipelineId"
            (click)="triggerPipeline()">
            <mat-icon *ngIf="!isLoading">play_circle</mat-icon>
            <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
            {{ isLoading ? 'Triggering...' : 'Trigger Pipeline' }}
          </button>
          
          <button 
            mat-stroked-button
            [disabled]="isLoading || !selectedProject"
            (click)="refreshPipelines()">
            <mat-icon>refresh</mat-icon>
            Refresh Pipelines
          </button>
        </div>
        
        <!-- Error Message -->
        <div *ngIf="error" class="error-message">
          <mat-icon color="warn">error</mat-icon>
          <span>{{ error }}</span>
        </div>
        
        <!-- Success Message -->
        <div *ngIf="success" class="success-message">
          <mat-icon color="primary">check_circle</mat-icon>
          <span>{{ success }}</span>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .pipeline-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    mat-form-field {
      width: 100%;
    }
    
    .debug-info {
      background-color: #f5f5f5;
      padding: 10px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .debug-info pre {
      white-space: pre-wrap;
      max-height: 200px;
      overflow: auto;
    }
    
    .action-buttons {
      display: flex;
      gap: 10px;
      margin: 16px 0;
    }
    
    .button-spinner {
      display: inline-block;
      margin-right: 8px;
    }
    
    .error-message {
      color: #f44336;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 8px;
      background-color: #ffebee;
      border-radius: 4px;
    }
    
    .success-message {
      color: #4caf50;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 8px;
      background-color: #e8f5e9;
      border-radius: 4px;
    }
  `]
})
export class PipelineRunnerComponent implements OnInit {
  projects: AzureProject[] = [];
  pipelines: AzurePipeline[] = [];
  selectedProject: string = '';
  selectedPipelineId: number | null = null;
  
  isLoading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  debugMode: boolean = true;
  
  constructor(
    @Inject(AzureDevOpsService) private azureDevOpsService: AzureDevOpsService,
    @Inject(TestResultsApiService) private testResultsService: TestResultsApiService
  ) {}
  
  ngOnInit(): void {
    this.loadProjects();
  }
  
  loadProjects(): void {
    this.isLoading = true;
    this.error = null;
    
    this.azureDevOpsService.getProjects()
      .subscribe({
        next: (projects: AzureProject[]) => {
          console.log('[Debug] Projects loaded:', projects);
          this.projects = projects || [];
          
          // If projects are loaded and there's at least one, select the first one by default
          if (this.projects.length > 0) {
            this.selectedProject = this.projects[0].Name;
            this.loadPipelines(this.selectedProject);
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.error = 'Failed to load Azure DevOps projects. Please try again.';
          this.isLoading = false;
        }
      });
  }
  
  onProjectSelect(projectName: string): void {
    if (projectName) {
      this.loadPipelines(projectName);
    }
  }
  
  loadPipelines(projectName: string): void {
    if (!projectName) {
      console.error('Project name is undefined or empty');
      this.error = 'Please select a project first';
      return;
    }
    
    console.log(`[Debug] Loading pipelines for project: ${projectName}`);
    
    this.selectedProject = projectName;
    this.isLoading = true;
    this.error = null;
    this.success = null;
    
    // Clear previously selected pipeline
    this.selectedPipelineId = null;
    this.pipelines = [];
    
    this.azureDevOpsService.getPipelines(projectName)      .subscribe({
        next: (rawPipelines: AzurePipeline[]) => {
          console.log('[Debug] Raw pipelines data:', rawPipelines);
          
          try {
            if (!rawPipelines || !Array.isArray(rawPipelines)) {
              console.warn('[Debug] Invalid pipelines data received');
              this.error = 'Invalid pipeline data received from server';
              this.pipelines = [];
            } else {
              // Map received pipelines to ensure they have proper Name properties
              this.pipelines = rawPipelines.map(p => {
                const id = p && typeof p === 'object' && 'Id' in p ? p.Id : Math.floor(Math.random() * 1000);
                const name = p && typeof p === 'object' && 'Name' in p ? p.Name : `Pipeline #${id}`;
                return { Id: id, Name: name };
              });
              
              // Select the first pipeline if available
              if (this.pipelines.length > 0) {
                this.selectedPipelineId = this.pipelines[0].Id;
              }
            }
          } catch (err: any) {
            console.error('Error processing pipeline data:', err);
            this.error = `Error processing pipeline data: ${err.message}`;
          } finally {
            this.isLoading = false;
          }
        },        error: (error: any) => {
          console.error(`Error loading pipelines for project ${projectName}:`, error);
          this.error = `Failed to load pipelines for project "${projectName}". Please try again.`;
          this.isLoading = false;
        }
      });
  }
  
  refreshPipelines(): void {
    if (this.selectedProject) {
      this.loadPipelines(this.selectedProject);
    }
  }
  
  triggerPipeline(): void {
    if (!this.selectedProject || !this.selectedPipelineId) {
      this.error = 'Please select both a project and pipeline';
      return;
    }
    
    const projectName = this.selectedProject;
    const pipelineId = this.selectedPipelineId;
    
    const selectedPipeline = this.pipelines.find(p => p.Id === pipelineId);
    const pipelineName = selectedPipeline ? selectedPipeline.Name : `Pipeline #${pipelineId}`;
    
    if (!confirm(`Are you sure you want to trigger pipeline "${pipelineName}" for project "${projectName}"?`)) {
      return;
    }
    
    this.isLoading = true;
    this.error = null;
    this.success = null;
    
    console.log(`[Debug] Triggering pipeline: Project=${projectName}, PipelineId=${pipelineId}`);
    
    this.testResultsService.triggerPipeline(projectName, pipelineId)
      .subscribe({
        next: (response: any) => {
          console.log('[Debug] Trigger pipeline response:', response);
          this.success = `Pipeline "${pipelineName}" triggered successfully! Run ID: ${response.runId || 'N/A'}`;
          this.isLoading = false;
        },        error: (error: any) => {
          console.error('Error triggering pipeline:', error);
          this.error = `Failed to trigger pipeline: ${error.message || 'Unknown error'}`;
          this.isLoading = false;
        }
      });
  }
}
