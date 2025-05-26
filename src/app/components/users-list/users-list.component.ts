import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { UserService } from '../../services/admin.role/user.service'; 
import { QAUser, QAPipeline, QAPipelinePermission } from '../../models/qa-user.model'; 
import { CommonModule } from '@angular/common';
import { DataTable } from 'simple-datatables';
import { PermissionsModalComponent } from '../permissions-modal/permissions-modal.component';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, timer } from 'rxjs';
declare const Swal: any;

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  imports: [CommonModule, PermissionsModalComponent, RouterModule]
})
export class UserListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('usersTable', { static: false }) usersTable!: ElementRef;
  users: QAUser[] = [];
  filteredUsers: QAUser[] = [];
  dataTable: any;
  
  // UI state properties
  isLoading: boolean = true;
  isMobile: boolean = false;
  searchTerm: string = '';
  currentView: 'all' | 'active' | 'inactive' = 'all';
  sortField: 'name' | 'email' | 'role' | 'status' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Modal properties
  showPermissionsModal = false;
  currentPipeline: QAPipeline | null = null;
  currentPermissions: QAPipelinePermission | null = null;
  currentUserId: string | null = null;
  
  // Project expansion tracking for mobile view
  expandedProjects: Map<string, Set<string>> = new Map();
  
  // Auto-refresh mechanism
  private refreshInterval = 5 * 60 * 1000; // 5 minutes
  private destroy$ = new Subject<void>();

  // Toggle auto-refresh functionality
  private autoRefreshSubscription: any = null;
  isAutoRefreshEnabled = false;
  
  // Selected user for details modal
  selectedUser: QAUser | null = null;

  constructor(
    private userService: UserService
  ) {
    // Check for mobile view on init and resize
    this.checkForMobileView();
    window.addEventListener('resize', () => this.checkForMobileView());
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
    
    if (this.isAutoRefreshEnabled) {
      // Enable auto-refresh
      this.autoRefreshSubscription = timer(this.refreshInterval, this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          console.log('Auto-refreshing user data...');
          this.loadUsers(true);
        });
      
      this.showToast('Auto-refresh enabled. Data will refresh every 5 minutes.', 'info');
    } else {
      // Disable auto-refresh
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
    
    // No automatic timer here - we'll use the toggle button instead
  }

  ngAfterViewInit(): void {
    console.log('View initialized, waiting for data...');
    // If data is already loaded, initialize the table
    if (this.users.length > 0 && this.usersTable) {
      console.log('Data already available, initializing DataTable');
      setTimeout(() => {
        this.initializeDataTable();
      }, 0);
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove event listeners
    window.removeEventListener('resize', () => this.checkForMobileView());
    
    // Destroy DataTable to prevent memory leaks
    if (this.dataTable) {
      this.dataTable.destroy();
    }
  }
  
  private checkForMobileView(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    
    // If view type has changed, reinitialize table
    if (wasMobile !== this.isMobile && this.users.length > 0) {
      setTimeout(() => {
        this.initializeDataTable();
      }, 0);
    }
  }
  
  // Helper method to initialize or refresh the DataTable
  private initializeDataTable(): void {
    // Only initialize DataTable for desktop view
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
    // Only show loading indicator for initial load, not for refresh
    if (!silent) {
      this.isLoading = true;
    }
    
    console.log(silent ? 'Refreshing user data...' : 'Loading users from server...');
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
        
        console.log(`Loaded ${users.length} users:`, users.map(u => ({ 
          name: `${u.Firstname} ${u.Lastname}`, 
          id: u.Id, 
          hasId: !!u.Id
        })));
        
        // Check if any users are missing IDs and log a warning
        const usersWithoutIds = users.filter(user => !user.Id);
        if (usersWithoutIds.length > 0) {
          console.warn(`${usersWithoutIds.length} users are missing IDs. These users cannot be modified.`);
          
          if (usersWithoutIds.length === users.length) {
            // All users are missing IDs, might be an API issue
            console.error('All users are missing IDs. This may indicate an API configuration issue.');
          }
        } else {
          console.log('All users have valid IDs.');
        }
        
        // Apply current filters and sorting
        this.applyFilters();
        
        // Wait for the DOM to be ready before initializing the table
        setTimeout(() => {
          // Reinitialize the table
          this.initializeDataTable();
          
          console.log('DataTable reinitialized with fresh data from server');
        }, 0);
        
        // Show a toast notification for silent refresh
        if (silent) {
          this.showToast('Users refreshed successfully', 'success');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error fetching users:', error);
        
        // Show toast notification
        this.showToast('Failed to load users. Please try again.', 'danger');
      }
    });
  }
  
  // Filter and sort users
  applyFilters(): void {
    let result = [...this.users];
    
    // Filter by status
    if (this.currentView !== 'all') {
      const filterStatus = this.currentView === 'active' ? 'Active' : 'Inactive';
      result = result.filter(user => user.Status === filterStatus);
    }
    
    // Filter by search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      result = result.filter(user => 
        user.Firstname.toLowerCase().includes(search) ||
        user.Lastname.toLowerCase().includes(search) ||
        user.Email.toLowerCase().includes(search) ||
        user.Role.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
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
  
  // Change view filter
  setViewFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.currentView = filter;
    this.applyFilters();
  }
  
  // Sort users
  sortBy(field: 'name' | 'email' | 'role' | 'status'): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.applyFilters();
  }
  
  // Search handler
  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }
  
  // Clear all filters and reset to defaults
  clearFilters(): void {
    this.searchTerm = '';
    this.currentView = 'all';
    this.sortField = 'name';
    this.sortDirection = 'asc';
    this.applyFilters();
    
    // Show a confirmation message
    this.showToast('All filters have been cleared', 'info');
  }
  
  // Project expansion for mobile view
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
  
  // Show toast notification
  private showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    const toastContainer = document.getElementById('toast-container');
    
    // Create container if it doesn't exist
    if (!toastContainer) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'position-fixed top-0 end-0 p-3';
      container.style.zIndex = '1050';
      document.body.appendChild(container);
    }
    
    // Create toast element
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
    
    // Add toast to container
    document.getElementById('toast-container')!.appendChild(toast);
    
    // Show toast
    const bsToast = new (window as any).bootstrap.Toast(toast, {
      animation: true,
      autohide: true,
      delay: 3000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  }

  onEditPermissionsClick(user: QAUser, project: any, pipeline: QAPipeline): void {
    console.log('Edit permissions for user:', user);
    console.log('User ID type:', typeof user.Id, 'User ID value:', user.Id);
    console.log('Pipeline:', pipeline);
    
    if (!pipeline || !pipeline.Permissions) {
      console.error('Pipeline or permissions missing:', pipeline);
      this.showToast('Cannot modify permissions. Pipeline data missing.', 'danger');
      return;
    }
    
    // Store current pipeline and permissions
    this.currentPipeline = pipeline;
    this.currentPermissions = { ...pipeline.Permissions }; // Create a copy to avoid reference issues
    
    // Strictly check if the ID is present - only use the real ID, not the uniqueIdentifier
    if (!user.Id) {
      console.error('User ID missing:', user);
      this.showToast('Cannot modify permissions: User ID missing. Please refresh the page and try again.', 'warning');
      return;
    }
    
    // Use only the real ID, not uniqueIdentifier
    this.currentUserId = user.Id;
    console.log('Using real ID for permissions update:', this.currentUserId);
    
    // Open the modal
    console.log('Opening permissions modal with:', {
      pipelineName: this.currentPipeline.Name,
      userId: this.currentUserId,
      pipelineId: this.currentPipeline.Id,
      permissions: this.currentPermissions
    });
    
    this.showPermissionsModal = true;
  }
  onRemoveUserClick(user: QAUser): void {
    // Create a custom confirmation dialog using Bootstrap
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
    
    // Show the modal
    const modal = new (window as any).bootstrap.Modal(document.getElementById(confirmationId));
    modal.show();
    
    // Handle confirm button click
    document.getElementById(`${confirmationId}-confirm`)!.addEventListener('click', () => {
      // Strictly check if the ID is present
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
          // Remove user from local array by ID only
          this.users = this.users.filter(u => u.Id !== user.Id);
          
          // Apply filters to updated users list
          this.applyFilters();
          
          // Refresh datatable
          setTimeout(() => {
            this.initializeDataTable();
          }, 0);
          
          // Hide and remove the modal
          modal.hide();
          document.getElementById(confirmationId)!.remove();
          
          this.showToast(`User ${user.Firstname} ${user.Lastname} has been removed successfully.`, 'success');
        },
        error: (error) => {
          console.error('Error removing user:', error);
          
          // Hide and remove the modal
          modal.hide();
          document.getElementById(confirmationId)!.remove();
          
          this.showToast('Failed to remove user. Please try again.', 'danger');
        }
      });
    });
    
    // Clean up the modal when hidden
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
    // More robust validation for currentUserId and currentPipeline
    if (!this.currentUserId || this.currentUserId === '') {
      console.error('Cannot save permissions: User ID is missing or empty');
      this.showToast('Cannot save permissions: User ID is missing.', 'danger');
      return;
    }

    if (!this.currentPipeline || !this.currentPipeline.Id) {
      console.error('Cannot save permissions: Pipeline or Pipeline ID is missing');
      this.showToast('Cannot save permissions: Pipeline data is missing.', 'danger');
      return;
    }

    console.log(`Attempting to update permissions with:
    - userId: ${this.currentUserId} (type: ${typeof this.currentUserId})
    - pipeline id: ${this.currentPipeline.Id} (type: ${typeof this.currentPipeline.Id})
    - permissions: ${JSON.stringify(permissions)}`);
    
    // Only proceed with API call for real user IDs
    this.userService.updatePermissions(this.currentUserId, this.currentPipeline.Id, permissions).subscribe({
      next: (response: any) => {
        console.log('Permission update successful:', response);
        
        // Update local permissions in the users array
        this.updateLocalPermissions(this.currentUserId!, this.currentPipeline!.Id, permissions);
        
        // Close the modal
        this.closePermissionsModal();
        
        this.showToast('Permissions updated successfully.', 'success');
      },
      error: (error: any) => {
        console.error('Error updating permissions:', error);
        
        // Display detailed error information for debugging
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
  
  // Update permissions in the local users array
  private updateLocalPermissions(userId: string, pipelineId: number, permissions: QAPipelinePermission): void {
    const userIndex = this.users.findIndex(u => u.Id === userId);
    
    if (userIndex === -1) {
      console.warn('User not found in local array for permission update.');
      return;
    }
    
    const user = this.users[userIndex];
    
    // Find the pipeline and update permissions
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

  // Export users to CSV
  exportToCSV(): void {
    if (this.filteredUsers.length === 0) {
      this.showToast('No users to export', 'warning');
      return;
    }
    
    try {
      // Generate CSV content
      const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Status'];
      let csvContent = headers.join(',') + '\n';
      
      // Add user data
      this.filteredUsers.forEach(user => {
        const row = [
          this.escapeCsvValue(user.Firstname),
          this.escapeCsvValue(user.Lastname),
          this.escapeCsvValue(user.Email),
          this.escapeCsvValue(user.Role),
          this.escapeCsvValue(user.Status)
        ];
        csvContent += row.join(',') + '\n';
      });
      
      // Create a Blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Set up link properties
      link.setAttribute('href', url);
      link.setAttribute('download', `users-export-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      // Add to document, trigger download, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showToast(`Exported ${this.filteredUsers.length} users to CSV`, 'success');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      this.showToast('Failed to export users', 'danger');
    }
  }
  
  // Helper function to escape CSV values
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    // Escape quotes and wrap in quotes if contains comma, quote or newline
    const needsQuotes = /[",\n\r]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }
  // Show user details in modal
  showUserDetails(user: QAUser): void {
    console.log('Showing details for user:', user);
    this.selectedUser = user;
    
    // Use Bootstrap's modal API to show the modal
    const modal = new (window as any).bootstrap.Modal(document.getElementById('userDetailsModal'));
    modal.show();
    
    // Add event listener to handle permissions modal interaction
    document.getElementById('userDetailsModal')?.addEventListener('hidden.bs.modal', () => {
      // Reset selected user when modal is closed
      this.selectedUser = null;
    });
  }
    // Handle edit permissions from user details modal
  onEditPermissionsFromDetails(user: QAUser, project: any, pipeline: QAPipeline): void {
    // Close the details modal first to avoid multiple modals being open
    const detailsModal = (window as any).bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
    if (detailsModal) {
      detailsModal.hide();
    }
    
    // Use the existing edit permissions method with a small delay to ensure smooth transition
    setTimeout(() => {
      this.onEditPermissionsClick(user, project, pipeline);
    }, 300); // Small delay to ensure the modal is fully closed
  }
  /**
   * Shows a context menu for selecting which pipeline permissions to edit
   */
  showPermissionsMenu(user: QAUser, event: MouseEvent): void {
    // Prevent the default context menu
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user has projects and pipelines
    if (!user.Id || !user.Projects || user.Projects.length === 0) {
      this.showToast('User has no projects or pipelines to manage permissions for.', 'warning');
      return;
    }
    
    // Clean up any existing menus first
    const existingMenu = document.getElementById('permissions-menu');
    if (existingMenu) {
      document.body.removeChild(existingMenu);
    }
    
    // Create a modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'permissions-backdrop';
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.zIndex = '1049';
    document.body.appendChild(backdrop);
    
    // Create a dropdown menu for projects and pipelines styled as a modal
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
    
    // Add header
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
    
    // Add user info
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
    
    // Add scrollable content area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'list-group list-group-flush';
    
    // Flatten projects and pipelines for easy selection
    let hasPipelines = false;
    
    user.Projects.forEach(project => {
      // Add project header
      const projectHeader = document.createElement('div');
      projectHeader.className = 'list-group-item list-group-item-light';
      projectHeader.innerHTML = `<i class="bi bi-folder me-1"></i> <strong>${project.Name}</strong>`;
      contentDiv.appendChild(projectHeader);
      
      if (project.Pipelines && project.Pipelines.length > 0) {
        hasPipelines = true;
        
        // Add pipeline items
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
            // Clean up menu
            document.body.removeChild(menu);
            document.body.removeChild(backdrop);
            // Open permissions modal
            this.onEditPermissionsClick(user, project, pipeline);
          });
          contentDiv.appendChild(item);
        });
      } else {
        // No pipelines message
        const noItem = document.createElement('div');
        noItem.className = 'list-group-item text-muted small';
        noItem.textContent = 'No pipelines available';
        contentDiv.appendChild(noItem);
      }
    });
    
    menu.appendChild(contentDiv);
    
    // Add footer
    const footerDiv = document.createElement('div');
    footerDiv.className = 'card-footer text-end';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-secondary btn-sm';
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
    
    // Add to document
    document.body.appendChild(menu);
    
    // Close when clicking backdrop
    backdrop.addEventListener('click', () => {
      document.body.removeChild(menu);
      document.body.removeChild(backdrop);
    });
  }
  
  /**
   * Counts the number of enabled permissions
   */
  private getPermissionCount(permissions: QAPipelinePermission): number {
    let count = 0;
    if (permissions.CanViewHistory) count++;
    if (permissions.CanTrigger) count++;
    if (permissions.CanViewResults) count++;
    if (permissions.CanDownloadReport) count++;
    return count;
  }
}
