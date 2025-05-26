import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { routes } from '../../consts';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule]
})
export class FooterComponent implements OnInit {
  public currentYear: number = new Date().getFullYear(); // Use dynamic current year instead of hardcoded value
  public routes = routes; // Expose routes enum to the template
  public title: string = 'APIs Test Automation Platform';
  
  ngOnInit(): void {
    console.log('Footer component initialized with updated configuration: ' + new Date().toISOString());
  }
}
