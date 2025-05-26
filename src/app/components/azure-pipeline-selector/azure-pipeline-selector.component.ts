import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit, ViewChildren, QueryList, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../services/admin.role/azure-devops.service';
import { TestResultsApiService } from '../../dashboard/services/test-results-api.service';
import { DropdownFixService } from '../../services/dropdown-fix.service';

@Component({
  selector: 'app-azure-pipeline-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],  template: `    <div class="pipeline-controls">
      <div class="selectors-row">        <mat-form-field appearance="outline" class="project-selector">
          <mat-label>Select Project</mat-label>          <mat-select [(ngModel)]="selectedProject" (selectionChange)="onProjectSelect($event.value)" 
                     panelClass="custom-select-panel azure-pipeline-dropdown"
                     disableOptionCentering
                     [disableRipple]="true" 
                     #projectSelect>
            <mat-option *ngFor="let project of projects" [value]="project.Name">
              {{project.Name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="pipeline-selector">
          <mat-label>Select Pipeline</mat-label>
          <mat-select [(ngModel)]="selectedPipelineId" [disabled]="!selectedProject || pipelines.length === 0 || isLoading"
                     panelClass="custom-select-panel azure-pipeline-dropdown"
                     disableOptionCentering
                     [disableRipple]="true"
                     #pipelineSelect>
            <mat-option *ngFor="let pipeline of pipelines" [value]="pipeline.Id">
              {{pipeline.Name}}
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="pipelines.length === 0 && selectedProject && !isLoading">
            No pipelines available
          </mat-hint>
        </mat-form-field>
      </div>
  
      <!-- Debug info (optional) -->
      <div *ngIf="debug" class="debug-info">
        <div>
          <strong>Selected Project:</strong> {{selectedProject || 'none'}}
        </div>
        <div>
          <strong>Selected Pipeline ID:</strong> {{selectedPipelineId || 'none'}}
        </div>
        <div>
          <strong>Projects:</strong> {{projects.length}}
        </div>
        <div>
          <strong>Pipelines:</strong> {{pipelines.length}}
        </div>
      </div>
  
      <div class="button-row">
        <button mat-raised-button color="accent" 
                [disabled]="isLoading || !selectedProject || !selectedPipelineId"
                (click)="triggerPipeline()">
          <mat-icon *ngIf="!isLoading">play_circle</mat-icon>
          <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
          {{ isLoading ? 'Triggering...' : 'Trigger Pipeline' }}
        </button>
      </div>
      
      <div *ngIf="error" class="error-message">
        <mat-icon color="warn">error</mat-icon>
        {{error}}
      </div>
      
      <div *ngIf="success" class="success-message">
        <mat-icon color="primary">check_circle</mat-icon>
        {{success}}
      </div>
    </div>  `,
  styles: [`    .pipeline-controls {
      width: 100%;
      padding: 16px;
      position: relative; /* Important for positioning context */
    }
      :host {
      display: block;
      position: relative;
      z-index: 10;
    }
    
    :host ::ng-deep .cdk-overlay-pane {
      transform: none !important;
      position: absolute !important;
      margin-top: 0 !important;
      transform-origin: unset !important;
      top: auto !important; /* Let it position naturally */
      left: auto !important;
    }
    
    :host ::ng-deep .cdk-overlay-connected-position-bounding-box {
      position: absolute !important;
      transform: none !important;
      transform-origin: unset !important;
      top: auto !important;
      left: auto !important;
    }
    
    :host ::ng-deep .mat-mdc-select-panel {
      transform: none !important;
      top: auto !important;
      bottom: auto !important;
      position: relative !important;
      min-width: 100% !important;
    }
    
    .selectors-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    mat-form-field {
      flex: 1 1 250px;
      min-width: 250px;
      position: relative;
    }      /* Component-specific select panel styling */
    ::ng-deep .custom-select-panel {
      margin-top: 4px !important;
      min-width: 100% !important;
      max-width: 500px !important;
      width: auto !important;
      max-height: 256px !important;
    }

    /* Override the panel wrapper */
    ::ng-deep .mat-mdc-select-panel-wrap {
      padding: 0 !important;
    }
    
    /* Override Material's option styling */
    ::ng-deep .mat-mdc-option {
      padding: 8px 16px !important;
      line-height: 1.5 !important;
    }
    
    /* Ensure form field styling */
    :host ::ng-deep .mat-mdc-form-field {
      width: 100%;
      position: relative;
      z-index: 1;
    }
    
    :host ::ng-deep .mat-mdc-text-field-wrapper {
      width: 100%;
    }
    
    /* Fix dropdown options */
    :host ::ng-deep .mat-mdc-option {
      height: auto !important;
      line-height: 1.4 !important;
      padding: 10px 16px !important;
    }
    
    .button-row {
      display: flex;
      margin: 16px 0;
    }
    .button-spinner {
      margin-right: 8px;
    }
    .debug-info {
      font-size: 12px;
      background: #f5f5f5;
      padding: 8px;
      margin-bottom: 16px;
      border-radius: 4px;
    }
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-top: 16px;
    }
    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4caf50;
      margin-top: 16px;
    }
  `]
})
export class AzurePipelineSelectorComponent implements OnInit, AfterViewChecked {
  @Input() debug = false;
  @Output() pipelineTriggered = new EventEmitter<{projectName: string, pipelineId: number, response: any}>();
  
  @ViewChildren(MatSelect) selectElements!: QueryList<MatSelect>;
  
  projects: AzureProject[] = [];
  pipelines: AzurePipeline[] = [];
  selectedProject = '';
  selectedPipelineId: number | null = null;
  
  isLoading = false;
  error: string | null = null;
  success: string | null = null;
  
  // Store pipelines by project ID to avoid reloading
  projectPipelines: { [key: string]: AzurePipeline[] } = {};
  
  // Flag to prevent multiple view checked runs
  private viewCheckedRun = false;
  
  constructor(
    private azureDevOpsService: AzureDevOpsService,
    private testResultsService: TestResultsApiService,
    private dropdownFixService: DropdownFixService
  ) {}  ngAfterViewChecked(): void {
    // Only run this once to avoid continuous DOM manipulation
    if (!this.viewCheckedRun && this.selectElements && this.selectElements.length > 0) {
      this.viewCheckedRun = true;
      console.log(`Found ${this.selectElements.length} select elements`);
      
      // Add CSS class to ensure proper targeting
      document.querySelectorAll('.pipeline-controls').forEach(el => {
        el.classList.add('azure-pipeline-selector');
      });
      
      // Set up event listeners on selects
      this.selectElements.forEach(select => {
        // Monitor select open/close events for positioning adjustments
        select.openedChange.subscribe(isOpen => {
          if (isOpen) {
            // Immediate fix when dropdown opens
            this.applyDropdownPositioningFix();
            
            // CRITICAL: Apply again after a small delay to ensure it works
            setTimeout(() => this.applyDropdownPositioningFix(), 10);
            setTimeout(() => this.applyDropdownPositioningFix(), 50);
          }
        });
      });
    }
  }
  
  /**
   * Directly fix dropdown positioning issues by manipulating the DOM
   * This is a focused solution for the specific issue
   */
  private applyDropdownPositioningFix(): void {
    // Get dropdown containers
    const boundingBoxes = document.querySelectorAll('.cdk-overlay-connected-position-bounding-box');
    const panelWrappers = document.querySelectorAll('.cdk-overlay-pane');
    
    // Process each bounding box
    boundingBoxes.forEach(box => {
      const boxEl = box as HTMLElement;
      
      // Remove all transforms and position constraints
      boxEl.style.transform = 'none';
      boxEl.style.position = 'absolute';
      boxEl.style.top = '';
      boxEl.style.left = '';
      boxEl.style.bottom = '';
      boxEl.style.right = '';
      
      // Add the critical fix class
      boxEl.classList.add('dropdown-position-fixed');
    });
    
    // Process each panel wrapper
    panelWrappers.forEach(pane => {
      const paneEl = pane as HTMLElement;
      
      // Reset position properties
      paneEl.style.transform = 'none';
      paneEl.style.position = 'absolute';
      paneEl.style.top = '';
      paneEl.style.left = '';
      
      // Add direct positioning class
      paneEl.classList.add('dropdown-position-fixed');
    });
  }

  ngOnInit(): void {
    console.log('AzurePipelineSelectorComponent initialized');
    this.loadProjects();
    
    // Global event listener to fix overlay positioning
    document.addEventListener('click', () => {
      // Reset overlay styles for dropdowns when clicking anywhere
      const overlays = document.querySelectorAll('.cdk-overlay-pane');
      overlays.forEach(overlay => {
        const el = overlay as HTMLElement;
        if (el.classList.contains('mat-mdc-select-panel-wrap') || 
            el.querySelector('.mat-mdc-select-panel')) {
          el.style.transform = 'none';
          el.style.position = 'absolute';
          el.style.top = 'auto'; 
          el.style.left = 'auto';
        }
      });
    });
    
    // Force recalculation after render
    setTimeout(() => {
      this.dropdownFixService.recalculatePositions();
    }, 100);
  }
    loadProjects(): void {
    this.isLoading = true;
    this.error = null;
    this.success = null;
    
    console.log('[Debug] Loading projects from API...');
    this.azureDevOpsService.getProjects()
      .subscribe({
        next: (projects) => {
          console.log('[Debug] Projects loaded:', JSON.stringify(projects));
          
          // Process the projects data
          if (projects && Array.isArray(projects) && projects.length > 0) {
            this.projects = projects.map(p => ({
              Id: p.Id || `project-${Math.random().toString(36).substring(7)}`,
              Name: p.Name || 'Unnamed Project'
            }));
            
            console.log('[Debug] First project found:', this.projects[0]);
            this.selectedProject = this.projects[0].Name;
            this.loadPipelines(this.selectedProject);
          } else {
            console.warn('[Debug] No projects found or invalid API response, using fallback data');
            // Add fallback data for testing
            this.projects = [
              { Id: 'test-id-1', Name: 'Migrator Platform Internships' },
              { Id: 'test-id-2', Name: 'API Automation Project' },
              { Id: 'test-id-3', Name: 'DevOps Demo Project' }
            ];
            this.selectedProject = this.projects[0].Name;
            this.loadPipelines(this.selectedProject);
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.error = 'Failed to load projects. Please try again.';
          this.isLoading = false;
          
          // Add fallback data even on error
          this.projects = [
            { Id: 'test-id-1', Name: 'Migrator Platform Internships' },
            { Id: 'test-id-2', Name: 'API Automation Project' }
          ];
          this.selectedProject = this.projects[0].Name;
          this.loadPipelines(this.selectedProject);
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
      this.error = 'Please select a project first';
      return;
    }
    
    // Find the project ID based on the name
    const project = this.projects.find(p => p.Name === projectName);
    if (!project || !project.Id) {
      this.error = 'Project not found or has no ID';
      return;
    }
    
    const projectId = project.Id;
    
    // Check if we already have pipelines for this project
    if (this.projectPipelines[projectId]) {
      console.log(`[Debug] Using cached pipelines for project ID: ${projectId}`);
      this.pipelines = this.projectPipelines[projectId];
      
      // Select the first pipeline if available
      if (this.pipelines.length > 0) {
        this.selectedPipelineId = this.pipelines[0].Id;
      } else {
        this.selectedPipelineId = null;
      }
      return;
    }
    
    console.log(`[Debug] Loading pipelines for project: "${projectName}" (ID: ${projectId})`);
    this.selectedProject = projectName;
    this.isLoading = true;
    this.error = null;
    this.success = null;
    
    // Clear previously selected pipeline
    this.selectedPipelineId = null;
    this.pipelines = [];
    
    this.azureDevOpsService.getPipelines(projectName)
      .subscribe({
        next: (rawPipelines) => {
          console.log('[Debug] Pipelines loaded:', JSON.stringify(rawPipelines));
          try {
            // Safely process pipeline data
            if (!rawPipelines || !Array.isArray(rawPipelines) || rawPipelines.length === 0) {
              console.warn('[Debug] Invalid pipeline data received or empty array:', rawPipelines);
              // Add fallback data for testing based on project name
              if (projectName.includes('Migrator')) {
                this.pipelines = [
                  { Id: 2746, Name: 'Migrator Pipeline (2746)' },
                  { Id: 2747, Name: 'Migrator Tests (2747)' }
                ];
              } else if (projectName.includes('API')) {
                this.pipelines = [
                  { Id: 3851, Name: 'API Tests (3851)' },
                  { Id: 3852, Name: 'API Automation (3852)' }
                ];
              } else {
                this.pipelines = [
                  { Id: 1001, Name: `${projectName} Pipeline (1001)` },
                  { Id: 1002, Name: `${projectName} Tests (1002)` }
                ];
              }
            } else {
              console.log('[Debug] Processing pipeline data...');
              this.pipelines = rawPipelines.map((p: any) => ({
                Id: p && typeof p === 'object' && 'Id' in p ? p.Id : Math.floor(Math.random() * 1000),
                Name: p && typeof p === 'object' && 'Name' in p ? p.Name : `Pipeline #${p && typeof p === 'object' && 'Id' in p ? p.Id : 'Unknown'}`
              }));
            }
            
            // Cache the pipelines for this project
            this.projectPipelines[projectId] = [...this.pipelines];
            
            // Select the first pipeline if available
            if (this.pipelines.length > 0) {
              this.selectedPipelineId = this.pipelines[0].Id;
              console.log(`[Debug] Selected first pipeline: ${this.selectedPipelineId}`);
            }
            
          } catch (err: any) {
            this.error = `Error processing pipeline data: ${err.message}`;
            console.error(err);
            // Still provide fallback data
            this.pipelines = [{ Id: 9999, Name: 'Fallback Pipeline' }];
            this.selectedPipelineId = 9999;
          } finally {
            this.isLoading = false;
            
            // Force re-positioning of dropdown after data loads
            setTimeout(() => {
              this.dropdownFixService.recalculatePositions();
            }, 100);
          }
        },
        error: (error) => {
          this.error = `Failed to load pipelines. Please try again.`;
          console.error(error);
          this.isLoading = false;
          
          // Add fallback data even on error
          this.pipelines = [
            { Id: 8888, Name: 'Emergency Backup Pipeline' },
            { Id: 8889, Name: 'Backup Test Run' }
          ];
          this.selectedPipelineId = 8888;
        }
      });
  }
  
  triggerPipeline(): void {
    if (!this.selectedProject || !this.selectedPipelineId) {
      this.error = 'Please select both a project and pipeline';
      return;
    }
    
    const selectedPipeline = this.pipelines.find(p => p.Id === this.selectedPipelineId);
    const pipelineName = selectedPipeline?.Name || `Pipeline #${this.selectedPipelineId}`;
    
    if (!confirm(`Are you sure you want to trigger pipeline "${pipelineName}" for project "${this.selectedProject}"?`)) {
      return;
    }
    
    this.isLoading = true;
    this.error = null;
    this.success = null;
    
    this.testResultsService.triggerPipeline(this.selectedProject, this.selectedPipelineId)
      .subscribe({
        next: (response) => {
          this.success = `Pipeline triggered successfully!`;
          this.pipelineTriggered.emit({
            projectName: this.selectedProject,
            pipelineId: this.selectedPipelineId!,
            response
          });
          this.isLoading = false;
        },
        error: (error) => {
          this.error = `Failed to trigger pipeline: ${error.message || 'Unknown error'}`;
          console.error('Error triggering pipeline:', error);
          this.isLoading = false;
        }
      });
  }
}
