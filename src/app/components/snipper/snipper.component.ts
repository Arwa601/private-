import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-snipper',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="container mt-4">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Code Snipper Tool</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="mt-3">
            <p>The snipper tool allows you to create, save, and organize code snippets for reuse across your projects.</p>
            <p>Content is being developed and will be available soon.</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    mat-card {
      margin-bottom: 20px;
    }
    
    mat-card-title {
      font-size: 24px;
      margin-bottom: 16px;
    }
  `]
})
export class SnipperComponent {}
