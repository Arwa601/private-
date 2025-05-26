import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="profile-container">
      <mat-card class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            <img src="https://ui-avatars.com/api/?name=User&background=random" alt="Profile">
          </div>
          <div class="profile-info">
            <h2>User Profile</h2>
            <p>API Test Automation Expert</p>
            <p><mat-icon>location_on</mat-icon> Montreal, Canada</p>
          </div>
        </div>
        
        <mat-divider></mat-divider>
        
        <div class="profile-details">          <div class="detail-section">
            <h3>Contact Information</h3>
            <p><strong>Email:</strong> user&#64;example.com</p>
            <p><strong>Phone:</strong> (123) 456-7890</p>
          </div>
          
          <div class="detail-section">
            <h3>Skills</h3>
            <div class="skills">
              <span class="skill-tag">API Testing</span>
              <span class="skill-tag">Automation</span>
              <span class="skill-tag">Angular</span>
              <span class="skill-tag">TypeScript</span>
              <span class="skill-tag">Node.js</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>About Me</h3>
            <p>Experienced software tester specializing in API test automation. Passionate about building robust test frameworks and ensuring software quality.</p>
          </div>
        </div>
        
        <div class="profile-actions">
          <button mat-raised-button color="primary">
            <mat-icon>edit</mat-icon> Edit Profile
          </button>
          <button mat-raised-button color="accent">
            <mat-icon>security</mat-icon> Change Password
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 20px;
    }
    
    .profile-card {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .profile-header {
      display: flex;
      align-items: center;
      padding: 20px;
    }
    
    .profile-avatar img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .profile-info {
      margin-left: 30px;
    }
    
    .profile-info h2 {
      margin-bottom: 5px;
      color: #333;
    }
    
    .profile-info p {
      margin: 5px 0;
      display: flex;
      align-items: center;
    }
    
    .profile-info mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
      margin-right: 5px;
    }
    
    .profile-details {
      padding: 20px;
    }
    
    .detail-section {
      margin-bottom: 20px;
    }
    
    .detail-section h3 {
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }
    
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .skill-tag {
      background-color: #e0e0e0;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 14px;
    }
    
    .profile-actions {
      display: flex;
      gap: 10px;
      padding: 0 20px 20px;
    }
  `]
})
export class ProfileComponent {
}
