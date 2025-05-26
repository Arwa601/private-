import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-route-diagnostics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="diagnostics-container">
      <h1>Angular Route Diagnostics</h1>
      
      <div class="info-panel">
        <div class="panel-header">
          <h2>Current Navigation</h2>
        </div>
        <div class="panel-content">
          <div class="info-item">
            <strong>Current URL:</strong> {{ router.url }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diagnostics-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    h1 {
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .info-panel {
      background-color: #f9f9f9;
      border-radius: 5px;
      margin: 15px 0;
      overflow: hidden;
    }
    
    .panel-header {
      background-color: #eee;
      padding: 10px 15px;
    }
    
    .panel-header h2 {
      margin: 0;
      font-size: 18px;
    }
    
    .panel-content {
      padding: 15px;
    }
    
    .info-item {
      margin-bottom: 10px;
      line-height: 1.5;
    }
  `]
})
export class RouteDiagnosticsComponent implements OnInit {
  constructor(public router: Router, public route: ActivatedRoute) {}

  ngOnInit(): void {
    // Initialization logic
  }
}
