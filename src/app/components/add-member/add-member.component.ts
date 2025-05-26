import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AzureDevOpsService, AzureProject, AzurePipeline } from '../../services/Azure/azure-devops.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { lastValueFrom } from 'rxjs';
import { PermissionsModalComponent } from '../permissions-modal/permissions-modal.component';
import { QAPipelinePermission } from '../../models/qa-user.model';
import { RouterModule, Router } from '@angular/router';

interface ProjectFormValue {
  ProjectId: string;
  Pipelines: PipelineFormValue[];
}

interface PipelineFormValue {
  Id: number;
  CanViewHistory: boolean;
  CanTrigger: boolean;
  CanViewResults: boolean;
  CanDownloadReport: boolean;
}

@Component({  selector: 'app-add-member',
  templateUrl: './add-member.component.html',
  styleUrls: ['./add-member.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, CommonModule, PermissionsModalComponent, RouterModule]
})
export class AddMemberComponent implements OnInit {
  memberForm: FormGroup;
  azureProjects: AzureProject[] = [];
  selectedProjectPipelines: { [key: string]: AzurePipeline[] } = {};
  showPermissionsModal: boolean = false;
  currentPipelineFormGroup: FormGroup | null = null;
  currentPipelineName: string = '';
  currentProjectIndex: number = -1;
  currentPipelineIndex: number = -1;
  debugMode: boolean = true;
  originalPermissions: any;
  constructor(
    private fb: FormBuilder,
    private azureDevOpsService: AzureDevOpsService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.memberForm = this.fb.group({
      Firstname: ['', Validators.required],
      Lastname: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Role: ['', Validators.required],
      Projects: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadAzureProjects();
    if (this.debugMode) {
      this.memberForm.valueChanges.subscribe(value => {
        console.log('[Debug] Form Value Changed:', value);
      });
    }
  }

  get Projects(): FormArray {
    return this.memberForm.get('Projects') as FormArray;
  }

  asFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }
  loadAzureProjects(): void {
    this.azureDevOpsService.getProjects().subscribe({
      next: (projects: AzureProject[]) => {
        this.azureProjects = projects;
        if (this.debugMode) {
          console.log('[Debug] Loaded projects:', projects);
        }
      },
      error: (error: any) => {
        console.error('Error loading Azure projects:', error);
        this.toastr.error('Failed to load Azure projects. Please try again.');
      }
    });
  }

  async loadPipelines(projectId: string): Promise<void> {
    if (!projectId) {
      console.error('Project ID is undefined or empty');
      return;
    }

    const project = this.azureProjects.find(p => p.Id === projectId);
    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return;
    }    try {
      const rawPipelines = await lastValueFrom(this.azureDevOpsService.getPipelines(project.Name)) as AzurePipeline[];
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

  addProject(): void {
    const projectGroup = this.fb.group({
      ProjectId: ['', Validators.required],
      Pipelines: this.fb.array([])
    });
    this.Projects.push(projectGroup);

    if (this.debugMode) {
      console.log('[Debug] Added project group:', projectGroup.value);
    }
  }

  removeProject(index: number): void {
    this.Projects.removeAt(index);
  }

  getPipelinesFormArray(projectIndex: number): FormArray {
    return this.Projects.at(projectIndex).get('Pipelines') as FormArray;
  }

  async addPipeline(projectIndex: number): Promise<void> {
    const projectId = this.Projects.at(projectIndex).get('ProjectId')?.value;
    if (!projectId) {
      this.toastr.error('Please select a project before adding a pipeline.');
      return;
    }

    await this.loadPipelines(projectId);

    const pipelines = this.selectedProjectPipelines[projectId];
    if (!pipelines?.length) {
      this.toastr.error('No pipelines available for this project.');
      return;
    }

    const defaultPipelineId = pipelines.length > 0 ? pipelines[0].Id : null;
    const pipelineGroup = this.fb.group({
      Id: [defaultPipelineId, Validators.required],
      CanViewHistory: [false],
      CanTrigger: [false],
      CanViewResults: [false],
      CanDownloadReport: [false]
    });

    this.getPipelinesFormArray(projectIndex).push(pipelineGroup);

    if (this.debugMode) {
      console.log('[Debug] Added pipeline group:', {
        projectIndex,
        pipelineGroup: pipelineGroup.value
      });
    }
  }

  removePipeline(projectIndex: number, pipelineIndex: number): void {
    this.getPipelinesFormArray(projectIndex).removeAt(pipelineIndex);
  }

  onPipelineSelect(projectIndex: number, pipelineIndex: number, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;

    const pipelineControl = this.getPipelinesFormArray(projectIndex).at(pipelineIndex) as FormGroup;
    const currentPipelineId = pipelineControl.get('Id')?.value;

    if (this.debugMode) {
      console.log('[Debug] Pipeline Selection:', {
        projectIndex,
        pipelineIndex,
        selectedValue,
        controlValue: pipelineControl.value,
        availableOptions: this.selectedProjectPipelines[this.Projects.at(projectIndex).get('ProjectId')?.value]?.map(p => p.Id)
      });
    }

    if (selectedValue && selectedValue !== 'null') {
      const pipelineId = Number(selectedValue);
      if (!isNaN(pipelineId) && pipelineId !== currentPipelineId) {
        pipelineControl.patchValue({
          Id: pipelineId
        }, { emitEvent: false });

        if (this.debugMode) {
          console.log('[Debug] Updated pipeline ID:', pipelineId);
        }
      } else if (this.debugMode) {
        console.log('[Debug] Invalid or unchanged pipeline ID:', selectedValue);
        if (selectedValue === 'undefined') {
          console.log('[Debug] Warning: selectedValue is "undefined". Check pipe.Id values in pipeline data.');
        }
      }
    } else if (selectedValue === 'null' && currentPipelineId !== null) {
      pipelineControl.patchValue({
        Id: null
      }, { emitEvent: false });

      if (this.debugMode) {
        console.log('[Debug] No pipeline selected');
      }
    }
  }

  openPermissionsModal(projectIndex: number, pipelineIndex: number): void {
    this.currentProjectIndex = projectIndex;
    this.currentPipelineIndex = pipelineIndex;
    this.currentPipelineFormGroup = this.getPipelinesFormArray(projectIndex).at(pipelineIndex) as FormGroup;
    
    // Obtenir le nom du pipeline pour l'affichage
    const projectId = this.Projects.at(projectIndex).get('ProjectId')?.value;
    const pipelineId = this.currentPipelineFormGroup.get('Id')?.value;
    
    if (projectId && pipelineId && this.selectedProjectPipelines[projectId]) {
      const pipeline = this.selectedProjectPipelines[projectId].find(p => p.Id === +pipelineId);
      this.currentPipelineName = pipeline?.Name || 'Pipeline';
    }
    
    this.showPermissionsModal = true;
  }

  closePermissionsModal(): void {
    this.showPermissionsModal = false;
    this.currentPipelineFormGroup = null;
    this.currentPipelineName = '';
    this.currentProjectIndex = -1;
    this.currentPipelineIndex = -1;
  }

  savePermissions(permissions: QAPipelinePermission): void {
    if (this.currentPipelineFormGroup) {
      this.currentPipelineFormGroup.patchValue({
        CanViewHistory: permissions.CanViewHistory,
        CanTrigger: permissions.CanTrigger,
        CanViewResults: permissions.CanViewResults,
        CanDownloadReport: permissions.CanDownloadReport
      });
    }
    this.closePermissionsModal();
  }

  onSubmit(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      this.toastr.error('Please fill in all required fields.');
      return;
    }
    const formValue = this.memberForm.getRawValue();
    let role: string;
    if (formValue.Role === '3') {
      role = 'QAEngineer';
    } else if (formValue.Role === '2') {
      role = 'QALead';
    } else if (formValue.Role === '1') {
      role = 'ProductOwner';
    } else if (formValue.Role === '') {
      this.toastr.error('Please select a role before submitting.');
      return;
    } else {
      throw new Error(`Invalid role value: ${formValue.Role}. Expected '3:QAENGINEER', '2:QALEAD', or '1:PRODUCTOWNER'`);
    }

    const userAccessRequest = {
      Firstname: formValue.Firstname,
      Lastname: formValue.Lastname,
      Email: formValue.Email,
      Role: role,
      Projects: formValue.Projects.map((project: ProjectFormValue) => ({
        ProjectId: project.ProjectId,
        Pipelines: project.Pipelines.map((pipeline: PipelineFormValue) => ({
          Id: Number(pipeline.Id),
          CanViewHistory: !!pipeline.CanViewHistory,
          CanTrigger: !!pipeline.CanTrigger,
          CanViewResults: !!pipeline.CanViewResults,
          CanDownloadReport: !!pipeline.CanDownloadReport
        }))
      }))
    };

    if (this.debugMode) {
      console.log('[Debug] Submitting form:', userAccessRequest);
    }

    const hasInvalidPipelines = userAccessRequest.Projects.some((project: ProjectFormValue) =>
      project.Pipelines.some((pipeline: PipelineFormValue) =>
        !pipeline.Id || isNaN(pipeline.Id)
      )
    );

    if (hasInvalidPipelines) {
      this.toastr.error('Please select valid pipelines for all projects.');
      return;
    }    this.azureDevOpsService.addMember(userAccessRequest).subscribe({
      next: (response: any) => {        // Create success modal with options to add another member or go to users list
        const successModalId = `success-modal-${Date.now()}`;
        const successModal = document.createElement('div');
        successModal.className = 'modal fade';
        successModal.id = successModalId;
        successModal.setAttribute('tabindex', '-1');
        successModal.setAttribute('aria-hidden', 'true');
        
        successModal.innerHTML = `
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-success text-white">
                <h5 class="modal-title">
                  <i class="bi bi-check-circle-fill me-2"></i>
                  Success
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p>User <strong>${formValue.Firstname} ${formValue.Lastname}</strong> was added successfully!</p>
              </div>
              <div class="modal-footer">
                <button type="button" id="add-another-btn" class="btn btn-secondary" data-bs-dismiss="modal">
                  <i class="bi bi-plus-circle me-2"></i>Add Another Member
                </button>
                <button type="button" id="go-to-users-btn" class="btn btn-primary">
                  <i class="bi bi-arrow-left me-2"></i>Go to Users List
                </button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(successModal);
        
        // Show the modal
        const modal = new (window as any).bootstrap.Modal(document.getElementById(successModalId));
        modal.show();
          // Add event listener for the "Go to Users List" button
        document.getElementById('go-to-users-btn')?.addEventListener('click', () => {
          modal.hide();
          this.router.navigate(['/']);
        });
        
        // Reset form only when "Add Another Member" is clicked
        document.getElementById('add-another-btn')?.addEventListener('click', () => {
          this.memberForm.reset();
          this.Projects.clear();
          this.addProject(); // Add an empty project to start with
        });
        
        this.toastr.success('Member added successfully!');
      },      error: (error: any) => {
        console.error('Error adding member:', error);
        this.toastr.error('Failed to add member. Please try again.');
      }
    });
  }
}