import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-settings-menu-app',
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('settingsAnimation', [
      state('visible', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      state('hidden', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      transition('hidden => visible', [
        animate('200ms ease-out')
      ]),
      transition('visible => hidden', [
        animate('200ms ease-in')
      ])
    ])
  ],
  template: `
    <div 
      class="settings-menu" 
      [@settingsAnimation]="isVisible ? 'visible' : 'hidden'"
      *ngIf="isVisible">
      <div class="settings-header">
        <h3>Settings</h3>
        <button class="close-btn" (click)="closeSettings()">×</button>
      </div>
      <div class="theme-options">
        <h4>Theme</h4>
        <div class="theme-colors">
          <div class="color-option blue" (click)="onThemeBlueChange()"></div>
          <div class="color-option pink" (click)="onThemePinkChange()"></div>
          <div class="color-option green" (click)="onThemeGreenChange()"></div>
        </div>
      </div>
      <div class="dark-mode-toggle">
        <h4>Dark Mode</h4>
        <div class="toggle-container">
          <input 
            type="checkbox" 
            id="darkModeToggle" 
            [checked]="isDarkMode"
            (change)="onDarkModeChange($event)"
          />
          <label for="darkModeToggle"></label>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-menu {
      position: fixed;
      top: 70px;
      right: 20px;
      width: 250px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 16px;
      z-index: 1000;
    }
    
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    h3 {
      margin: 0;
      font-size: 18px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      color: #666;
    }
    
    .close-btn:hover {
      color: #333;
    }
    
    .theme-options, .dark-mode-toggle {
      margin-bottom: 16px;
    }
    
    h4 {
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .theme-colors {
      display: flex;
      gap: 12px;
    }
    
    .color-option {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .color-option:hover {
      transform: scale(1.1);
    }
    
    .blue {
      background-color: #1976d2;
    }
    
    .pink {
      background-color: #e91e63;
    }
    
    .green {
      background-color: #4caf50;
    }
    
    .toggle-container {
      position: relative;
      display: inline-block;
    }
    
    input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    label {
      display: block;
      width: 50px;
      height: 24px;
      background-color: #ccc;
      border-radius: 12px;
      cursor: pointer;
      position: relative;
      transition: background-color 0.3s;
    }
    
    label::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: white;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }
    
    input:checked + label {
      background-color: #1976d2;
    }
    
    input:checked + label::after {
      transform: translateX(26px);
    }
  `]
})
export class SettingsMenuAppComponent {
  @Input() isVisible: boolean = false;
  @Output() visibilityChange = new EventEmitter<boolean>();
  @Output() darkMode = new EventEmitter<boolean>();
  @Output() themeOnBlue = new EventEmitter<void>();
  @Output() themeOnPink = new EventEmitter<void>();
  @Output() themeOnGreen = new EventEmitter<void>();

  isDarkMode = false;

  onDarkModeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.isDarkMode = target.checked;
    this.darkMode.emit(this.isDarkMode);
  }

  onThemeBlueChange(): void {
    this.themeOnBlue.emit();
  }

  onThemePinkChange(): void {
    this.themeOnPink.emit();
  }

  onThemeGreenChange(): void {
    this.themeOnGreen.emit();
  }

  closeSettings(): void {
    this.isVisible = false;
    this.visibilityChange.emit(false);
  }
}
