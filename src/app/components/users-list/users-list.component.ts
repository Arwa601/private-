import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { UserService } from '../../services/admin.role/user.service';
import { QAUser, QAPipeline, QAPipelinePermission, QAProject } from '../../models/qa-user.model';
import { CommonModule } from '@angular/common';
import { DataTable } from 'simple-datatables';
import { PermissionsModalComponent } from '../permissions-modal/permissions-modal.component';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, timer } from 'rxjs';
declare const Swal: any;

interface ExtendedQAUser extends QAUser {
  showPassword: boolean;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  imports: [CommonModule, PermissionsModalComponent, RouterModule]
})
export class UserListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('usersTable', { static: false }) usersTable!: ElementRef;
  users: ExtendedQAUser[] = [];
  filteredUsers: ExtendedQAUser[] = [];
  dataTable: any;

  isLoading: boolean = true;
  isMobile: boolean = false;
  searchTerm: string = '';
  currentView: 'all' | 'active' | 'inactive' = 'all';
  sortField: 'name' | 'email' | 'role' | 'status' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  showPermissionsModal = false;
  currentPipeline: QAPipeline | null = null;
  currentPermissions: QAPipelinePermission | null = null;
  currentUserId: string | null = null;

  expandedProjects: Map<string, Set<string>> = new Map();
  private refreshInterval = 5 * 60 * 1000;
  private destroy$ = new Subject<void>();
  private autoRefreshSubscription: any = null;
  isAutoRefreshEnabled = false;

  // New properties for updating projects
  showUpdateProjectsModal = false;
  currentUserForProjects: ExtendedQAUser | null = null;
  availableProjects: QAProject[] = []; // Mocked list of all projects (assumed to be fetched)

  constructor(
    private userService: UserService
  ) {
    this.checkForMobileView();
    window.addEventListener('resize', () => this.checkForMobileView());
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;

    if (this.isAutoRefreshEnabled) {
      this.autoRefreshSubscription = timer(this.refreshInterval, this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log('Auto-refreshing user data...');
          this.loadUsers(true);
        });

      this.showToast('Auto-refresh enabled. Data will refresh every 5 minutes.', 'info');
    } else {
      if (this.autoRefreshSubscription) {
        this.autoRefreshSubscription.unsubscribe();
        this.autoRefreshSubscription = null;
      }

      this.showToast('Auto-refresh disabled.', 'info');
    }
  }

  ngOnInit(): void {
    console.log('UserListComponent initialized');
    this.loadUsers();
    this.loadAvailableProjects(); 
  }

  ngAfterViewInit(): void {
    console.log('View initialized, waiting for data...');
    if (this.users.length > 0 && this.usersTable) {
      console.log('Data already available, initializing DataTable');
      setTimeout(() => {
        this.initializeDataTable();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.checkForMobileView());
    if (this.dataTable) {
      this.dataTable.destroy();
    }
  }

  private checkForMobileView(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (wasMobile !== this.isMobile && this.users.length > 0) {
      setTimeout(() => {
        this.initializeDataTable();
      }, 0);
    }
  }

  private initializeDataTable(): void {
    if (this.isMobile) {
      if (this.dataTable) {
        this.dataTable.destroy();
        this.dataTable = null;
      }
      return;
    }

    try {
      console.log('Starting DataTable initialization...');

      if (this.dataTable) {
        console.log('Destroying existing DataTable instance');
        this.dataTable.destroy();
      }

      if (this.usersTable && this.usersTable.nativeElement) {
        console.log('Creating new DataTable instance');
        this.dataTable = new DataTable(this.usersTable.nativeElement, {
          perPageSelect: [10, 25, 50, 100],
          perPage: 10,
          searchable: true,
          sortable: true,
          fixedHeight: false,
          labels: {
            placeholder: "Search users...",
            perPage: "Users per page",
            noRows: "No users found",
            info: "Showing {start} to {end} of {rows} users"
          }
        });

        console.log('DataTable initialized successfully with', this.users.length, 'users');
      } else {
        console.error('usersTable element not found or not ready');
      }
    } catch (error) {
      console.error('Error initializing DataTable:', error);
    }
  }

  loadUsers(silent: boolean = false): void {
    if (!silent) {
      this.isLoading = true;
    }

    console.log(silent ? 'Refreshing user data...' : 'Loading users from server...');

    this.userService.getAllUsers().subscribe({
      next: (users: QAUser[]) => {
        this.users = users.map(user => ({
          ...user,
          showPassword: false
        })) as ExtendedQAUser[];
        this.isLoading = false;

        console.log(`Loaded ${users.length} users:`, users.map(u => ({
          name: `${u.Firstname} ${u.Lastname}`,
          id: u.Id,
          hasId: !!u.Id
        })));

        const usersWithoutIds = users.filter(user => !user.Id);
        if (usersWithoutIds.length > 0) {
          console.warn(`${usersWithoutIds.length} users are missing IDs. These users cannot be modified.`);

          if (usersWithoutIds.length === users.length) {
            console.error('All users are missing IDs. This may indicate an API configuration issue.');
          }
        } else {
          console.log('All users have valid IDs.');
        }

        this.applyFilters();

        setTimeout(() => {
          this.initializeDataTable();

          console.log('DataTable reinitialized with fresh data from server');
        }, 0);

        if (silent) {
          this.showToast('Users refreshed successfully', 'success');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error fetching users:', error);

        this.showToast('Failed to load users. Please try again.', 'danger');
      }
    });
  }

  private loadAvailableProjects(): void {
    // Mocked list of projects (in a real app, this would come from an API)
    this.availableProjects = [
      { Id: 'proj1', Name: 'Project Alpha', Pipelines: [] },
      { Id: 'proj2', Name: 'Project Beta', Pipelines: [] },
      { Id: 'proj3', Name: 'Project Gamma', Pipelines: [] },
      { Id: 'proj4', Name: 'Project Delta', Pipelines: [] }
    ];
  }

  applyFilters(): void {
    let result = [...this.users];

    if (this.currentView !== 'all') {
      const filterStatus = this.currentView === 'active' ? 'Active' : 'Inactive';
      result = result.filter(user => user.Status === filterStatus);
    }

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(user =>
        user.Firstname.toLowerCase().includes(search) ||
        user.Lastname.toLowerCase().includes(search) ||
        user.Email.toLowerCase().includes(search) ||
        user.Role.toLowerCase().includes(search) ||
        (user.Password && user.Password.toLowerCase().includes(search))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (this.sortField) {
        case 'name':
          comparison = `${a.Firstname} ${a.Lastname}`.localeCompare(`${b.Firstname} ${b.Lastname}`);
          break;
        case 'email':
          comparison = a.Email.localeCompare(b.Email);
          break;
        case 'role':
          comparison = a.Role.localeCompare(b.Role);
          break;
        case 'status':
          comparison = a.Status.localeCompare(b.Status);
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredUsers = result;
  }

  setViewFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.currentView = filter;
    this.applyFilters();
  }

  sortBy(field: 'name' | 'email' | 'role' | 'status'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentView = 'all';
    this.sortField = 'name';
    this.sortDirection = 'asc';
    this.applyFilters();

    this.showToast('All filters have been cleared', 'info');
  }

  toggleProject(userId: string, projectId: string): void {
    if (!userId || !projectId) return;

    if (!this.expandedProjects.has(userId)) {
      this.expandedProjects.set(userId, new Set<string>());
    }

    const userProjects = this.expandedProjects.get(userId);
    if (userProjects) {
      if (userProjects.has(projectId)) {
        userProjects.delete(projectId);
      } else {
        userProjects.add(projectId);
      }
    }
  }

  isProjectExpanded(userId: string, projectId: string): boolean {
    if (!userId || !projectId) return false;
    return this.expandedProjects.get(userId)?.has(projectId) || false;
  }

  private showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    const toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '1050';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const toastId = `toast-${Date.now()}`;
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    document.getElementById('toast-container')!.appendChild(toast);

    const bsToast = new (window as any).bootstrap.Toast(toast, {
      animation: true,
      autohide: true,
      delay: 3000
    });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  onEditPermissionsClick(user: ExtendedQAUser, project: any, pipeline: QAPipeline): void {
    console.log('Edit permissions for user:', user);
    console.log('User ID type:', typeof user.Id, 'User ID value:', user.Id);
    console.log('Pipeline:', pipeline);

    if (!pipeline || !pipeline.Permissions) {
      console.error('Pipeline or permissions missing:', pipeline);
      this.showToast('Cannot modify permissions. Pipeline data missing.', 'danger');
      return;
    }

    this.currentPipeline = pipeline;
    this.currentPermissions = { ...pipeline.Permissions };

    if (!user.Id) {
      console.error('User ID missing:', user);
      this.showToast('Cannot modify permissions: User ID missing. Please refresh the page and try again.', 'warning');
      return;
    }

    this.currentUserId = user.Id;
    console.log('Using real ID for permissions update:', this.currentUserId);

    console.log('Opening permissions modal with:', {
      pipelineName: this.currentPipeline.Name,
      userId: this.currentUserId,
      pipelineId: this.currentPipeline.Id,
      permissions: this.currentPermissions
    });

    this.showPermissionsModal = true;
  }

  onRemoveUserClick(user: ExtendedQAUser): void {
    const confirmationId = `delete-confirmation-${Date.now()}`;
    const confirmationDialog = document.createElement('div');
    confirmationDialog.className = 'modal fade';
    confirmationDialog.id = confirmationId;
    confirmationDialog.setAttribute('tabindex', '-1');
    confirmationDialog.setAttribute('aria-labelledby', `${confirmationId}-title`);
    confirmationDialog.setAttribute('aria-hidden', 'true');

    confirmationDialog.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title" id="${confirmationId}-title">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Confirm Deletion
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete the user <strong>${user.Firstname} ${user.Lastname}</strong>?</p>
            <p class="mb-0 text-danger"><small>This action cannot be undone.</small></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="${confirmationId}-confirm">
              <i class="bi bi-trash-fill me-2"></i>Delete User
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(confirmationDialog);

    const modal = new (window as any).bootstrap.Modal(document.getElementById(confirmationId));
    modal.show();

    document.getElementById(`${confirmationId}-confirm`)!.addEventListener('click', () => {
      if (!user.Id) {
        console.error('User ID missing:', user);
        this.showToast('Cannot delete user: Missing ID. Please refresh the page and try again.', 'warning');
        modal.hide();
        document.getElementById(confirmationId)!.remove();
        return;
      }

      console.log('Removing user:', user.Firstname, user.Lastname, 'with ID:', user.Id);

      this.userService.removeUser(user.Id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.Id !== user.Id);

          this.applyFilters();

          setTimeout(() => {
            this.initializeDataTable();
          }, 0);

          modal.hide();
          document.getElementById(confirmationId)!.remove();

          this.showToast(`User ${user.Firstname} ${user.Lastname} has been removed successfully.`, 'success');
        },
        error: (error) => {
          console.error('Error removing user:', error);

          modal.hide();
          document.getElementById(confirmationId)!.remove();

          this.showToast('Failed to remove user. Please try again.', 'danger');
        }
      });
    });

    document.getElementById(confirmationId)!.addEventListener('hidden.bs.modal', function () {
      document.getElementById(confirmationId)!.remove();
    });
  }

  closePermissionsModal(): void {
    this.showPermissionsModal = false;
    this.currentPipeline = null;
    this.currentPermissions = null;
  }

  savePermissions(permissions: QAPipelinePermission): void {
    if (!this.currentUserId || this.currentUserId === '') {
      console.error('Cannot save permissions: User ID is missing or empty');
      this.showToast('Cannot save permissions: User ID is missing.', 'danger');
      return;
    }

    if (!this.currentPipeline || !this.currentPipeline.Id) {
      console.error('Cannot save permissions: Pipeline or Pipeline ID is missing');
      this.showToast('Cannot save permissions: Pipeline data missing.', 'danger');
      return;
    }

    console.log(`Attempting to update permissions with:
    - userId: ${this.currentUserId} (type: ${typeof this.currentUserId})
    - pipeline id: ${this.currentPipeline.Id} (type: ${typeof this.currentPipeline.Id})
    - permissions: ${JSON.stringify(permissions)}`);

    this.userService.updatePermissions(this.currentUserId, this.currentPipeline.Id, permissions).subscribe({
      next: (response: any) => {
        console.log('Permission update successful:', response);

        this.updateLocalPermissions(this.currentUserId!, this.currentPipeline!.Id, permissions);

        this.closePermissionsModal();

        this.showToast('Permissions updated successfully.', 'success');
      },
      error: (error: any) => {
        console.error('Error updating permissions:', error);

        let errorMessage = 'Failed to update permissions. Please try again.';

        if (error.status === 404) {
          errorMessage = 'User not found. The user ID might be invalid.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid request. Please check the permission data format.';
        }

        if (error.error && typeof error.error === 'string') {
          errorMessage += ' Details: ' + error.error;
        }

        this.showToast(errorMessage, 'danger');
      }
    });
  }

  private updateLocalPermissions(userId: string, pipelineId: number, permissions: QAPipelinePermission): void {
    const userIndex = this.users.findIndex(u => u.Id === userId);

    if (userIndex === -1) {
      console.warn('User not found in local array for permission update.');
      return;
    }

    const user = this.users[userIndex];

    let found = false;

    for (const project of user.Projects) {
      const pipeline = project.Pipelines.find(p => p.Id === pipelineId);

      if (pipeline) {
        pipeline.Permissions = { ...permissions };
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn('Pipeline not found in local array for permission update.');
    }
  }

  exportToCSV(): void {
    if (this.filteredUsers.length === 0) {
      this.showToast('No users to export', 'warning');
      return;
    }

    try {
      const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Status', 'Password'];
      let csvContent = headers.join(',') + '\n';

      this.filteredUsers.forEach(user => {
        const row = [
          this.escapeCsvValue(user.Firstname),
          this.escapeCsvValue(user.Lastname),
          this.escapeCsvValue(user.Email),
          this.escapeCsvValue(user.Role),
          this.escapeCsvValue(user.Status),
          this.escapeCsvValue(user.Password || '')
        ];
        csvContent += row.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      link.setAttribute('href', url);
      link.setAttribute('download', `users-export-${timestamp}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast(`Exported ${this.filteredUsers.length} users to CSV`, 'success');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      this.showToast('Failed to export users', 'danger');
    }
  }

  private escapeCsvValue(value: string): string {
    if (!value) return '';
    const needsQuotes = /[",\n\r]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  onUpdateProjectsClick(user: ExtendedQAUser): void {
    if (!user.Id) {
      this.showToast('Cannot update projects: User ID missing.', 'warning');
      return;
    }

    this.currentUserForProjects = user;
    this.showUpdateProjectsModal = true;
  }

  closeUpdateProjectsModal(): void {
    this.showUpdateProjectsModal = false;
    this.currentUserForProjects = null;
  }

  // New method to handle the select change event
  onAddProject(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const projectId = target.value;

    // Reset the select to the default option after selection
    target.value = '';

    if (projectId) {
      this.addProjectToUser(projectId);
    }
  }

  // Add a project to the user
  addProjectToUser(projectId: string): void {
    if (!this.currentUserForProjects || !this.currentUserForProjects.Id) {
      this.showToast('Cannot add project: User not selected.', 'danger');
      return;
    }

    const userId = this.currentUserForProjects.Id;
    const alreadyAssigned = this.currentUserForProjects.Projects.some(p => p.Id === projectId);

    if (alreadyAssigned) {
      this.showToast('Project is already assigned to the user.', 'warning');
      return;
    }

    this.userService.addUserProject(userId, projectId).subscribe({
      next: () => {
        const project = this.availableProjects.find(p => p.Id === projectId);
        if (project) {
          this.currentUserForProjects!.Projects.push(project);
          this.users = [...this.users]; // Trigger change detection
          this.applyFilters();
          this.showToast(`Project ${project.Name} added to user.`, 'success');
        }
      },
      error: (error) => {
        console.error('Error adding project:', error);
        this.showToast('Failed to add project. Please try again.', 'danger');
      }
    });
  }

  // Remove a project from the user
  removeProjectFromUser(projectId: string): void {
    if (!this.currentUserForProjects || !this.currentUserForProjects.Id) {
      this.showToast('Cannot remove project: User not selected.', 'danger');
      return;
    }

    const userId = this.currentUserForProjects.Id;
    const projectIndex = this.currentUserForProjects.Projects.findIndex(p => p.Id === projectId);

    if (projectIndex === -1) {
      this.showToast('Project not assigned to the user.', 'warning');
      return;
    }

    this.userService.removeUserProject(userId, projectId).subscribe({
      next: () => {
        this.currentUserForProjects!.Projects.splice(projectIndex, 1);
        this.users = [...this.users]; // Trigger change detection
        this.applyFilters();
        const project = this.availableProjects.find(p => p.Id === projectId);
        this.showToast(`Project ${project?.Name} removed from user.`, 'success');
      },
      error: (error) => {
        console.error('Error removing project:', error);
        this.showToast('Failed to remove project. Please try again.', 'danger');
      }
    });
  }

  showPermissionsMenu(user: ExtendedQAUser, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!user.Id || !user.Projects || user.Projects.length === 0) {
      this.showToast('User has no projects or pipelines to manage permissions for.', 'warning');
      return;
    }

    const existingMenu = document.getElementById('permissions-menu');
    if (existingMenu) {
      document.body.removeChild(existingMenu);
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'permissions-backdrop';
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1049';
    document.body.appendChild(backdrop);

    const menuId = 'permissions-menu';
    const menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'card permissions-dropdown';
    menu.style.position = 'fixed';
    menu.style.left = '50%';
    menu.style.top = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    menu.style.zIndex = '1050';
    menu.style.minWidth = '400px';
    menu.style.maxWidth = '90%';
    menu.style.maxHeight = '80vh';
    menu.style.overflowY = 'auto';
    menu.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.35)';
    menu.style.border = 'none';
    menu.style.borderRadius = '0.375rem';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'card-header d-flex justify-content-between align-items-center';

    const header = document.createElement('h5');
    header.className = 'mb-0';
    header.innerHTML = `<i class="bi bi-shield-lock me-2 text-primary"></i> Manage Permissions`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = () => {
      document.body.removeChild(menu);
      document.body.removeChild(backdrop);
    };

    headerDiv.appendChild(header);
    headerDiv.appendChild(closeBtn);
    menu.appendChild(headerDiv);

    const userInfo = document.createElement('div');
    userInfo.className = 'card-body border-bottom pb-2 pt-2';
    userInfo.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="avatar rounded-circle text-bg-primary me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; font-size: 14px;">
          ${user.Firstname.charAt(0)}${user.Lastname.charAt(0)}
        </div>
        <div>
          <div class="fw-medium">${user.Firstname} ${user.Lastname}</div>
          <small class="text-muted">${user.Email}</small>
        </div>
      </div>
    `;
    menu.appendChild(userInfo);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'list-group list-group-flush';

    let hasPipelines = false;

    user.Projects.forEach(project => {
      const projectHeader = document.createElement('div');
      projectHeader.className = 'list-group-item list-group-item-light';
      projectHeader.innerHTML = `<i class="bi bi-folder me-1"></i> <strong>${project.Name}</strong>`;
      contentDiv.appendChild(projectHeader);

      if (project.Pipelines && project.Pipelines.length > 0) {
        hasPipelines = true;

        project.Pipelines.forEach(pipeline => {
          const item = document.createElement('button');
          item.className = 'list-group-item list-group-item-action';
          item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
              <div><i class="bi bi-diagram-3 me-2"></i> ${pipeline.Name}</div>
              <span class="badge bg-light text-dark border">${this.getPermissionCount(pipeline.Permissions)}/4</span>
            </div>
          `;
          item.addEventListener('click', () => {
            document.body.removeChild(menu);
            document.body.removeChild(backdrop);
            this.onEditPermissionsClick(user, project, pipeline);
          });
          contentDiv.appendChild(item);
        });
      } else {
        const noItem = document.createElement('div');
        noItem.className = 'list-group-item text-muted small';
        noItem.textContent = 'No pipelines available';
        contentDiv.appendChild(noItem);
      }
    });

    menu.appendChild(contentDiv);

    const footerDiv = document.createElement('div');
    footerDiv.className = 'card-footer text-end';

    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-sm btn-outline-secondary';
    closeButton.textContent = 'Close';
    closeButton.onclick = () => {
      document.body.removeChild(menu);
      document.body.removeChild(backdrop);
    };

    footerDiv.appendChild(closeButton);
    menu.appendChild(footerDiv);

    if (!hasPipelines) {
      document.body.removeChild(backdrop);
      this.showToast('User has no pipelines to manage permissions for.', 'warning');
      return;
    }

    document.body.appendChild(menu);

    backdrop.addEventListener('click', () => {
      document.body.removeChild(menu);
      document.body.removeChild(backdrop);
    });
  }

  private getPermissionCount(permissions: QAPipelinePermission): number {
    let count = 0;
    if (permissions.CanViewHistory) count++;
    if (permissions.CanTrigger) count++;
    if (permissions.CanViewResults) count++;
    if (permissions.CanDownloadReport) count++;
    return count;
  }

  togglePasswordVisibility(user: ExtendedQAUser): void {
    user.showPassword = !user.showPassword;
  }
}