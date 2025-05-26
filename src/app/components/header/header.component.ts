import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../components/ced logo/logo.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../login/auth.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  @Input() logoSrc: string = 'assets/images/ced-logo.svg';
  @Input() isMenuOpened: boolean = true;
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  
  isDropdownOpen: boolean = false;
  userName: string = '';
  isAuthenticated: boolean = false;
    constructor(
    public authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-profile') && this.isDropdownOpen) {
        this.isDropdownOpen = false;
      }
    });
    
    // Subscribe to auth state changes
    this.authService.authState$.subscribe(state => {
      this.isAuthenticated = state.isAuthenticated;
      if (state.isAuthenticated) {
        this.userName = `${state.firstName} ${state.lastName}`;
      } else {
        this.userName = 'Guest';
      }
    });
  }
  
  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }
  
  toggleDropdown(event: Event): void {
    event.stopPropagation(); 
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  onLogoutClick(): void {
    // Handle logout click
    this.authService.logout();
    this.isDropdownOpen = false;
    this.router.navigate(['/login']);
  }
}
