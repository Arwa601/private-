import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { SharedService } from '../services/shared.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent
  ]
})
export class LayoutComponent implements OnInit, OnDestroy {
  public isShowSidebar: boolean = true;
  public mobileQuery: MediaQueryList | null = null;
  private mobileQueryListener: (() => void) | null = null;

  constructor(private service: SharedService) {}

  ngOnInit(): void {
    this.mobileQuery = window.matchMedia('(max-width: 1024px)');
    this.mobileQueryListener = () => {
      this.isShowSidebar = !this.mobileQuery?.matches;
    };
    
    if (this.mobileQuery) {
      this.mobileQuery.addEventListener('change', this.mobileQueryListener);
      this.isShowSidebar = !this.mobileQuery.matches;
    }
  }

  public ngOnDestroy(): void {
    if (this.mobileQuery && this.mobileQueryListener) {
      this.mobileQuery.removeEventListener('change', this.mobileQueryListener);
    }
  }

  public toggleSidebar(): void {
    this.isShowSidebar = !this.isShowSidebar;
    
    // Add a small delay to allow for proper DOM rendering
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      // Add a body class to prevent scrolling when sidebar is open on mobile
      if (this.mobileQuery?.matches && this.isShowSidebar) {
        document.body.classList.add('sidebar-open-mobile');
      } else {
        document.body.classList.remove('sidebar-open-mobile');
      }
    }, 100);
  }

  // Settings methods removed

  public isBlueTheme: boolean = true;
  public isPinkTheme: boolean = false;
  public isGreenTheme: boolean = false;
  public isDarkMode: boolean = false;

  public changeThemeOnBlue(): void {
    this.isBlueTheme = true;
    this.isPinkTheme = false;
    this.isGreenTheme = false;
    this.service.setBlueTheme();
  }
  
  public changeThemeOnPink(): void {
    this.isBlueTheme = false;
    this.isPinkTheme = true;
    this.isGreenTheme = false;
    this.service.setPinkTheme();
  }
  
  public changeThemeOnGreen(): void {
    this.isBlueTheme = false;
    this.isPinkTheme = false;
    this.isGreenTheme = true;
    this.service.setGreenTheme();
  }
  
  public onDarkMode(value: boolean): void {
    this.isDarkMode = value;
    this.service.setDarkMode(value);
  }
}
