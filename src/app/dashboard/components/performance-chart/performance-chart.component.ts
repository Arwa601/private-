import { Component, Input, OnInit } from '@angular/core';

interface PerformanceChartData {
  success: number[];
  failed: number[];
  labels: string[];
  integration: number;
  sdk: number;
}

@Component({
  selector: 'app-performance-chart',
  templateUrl: './performance-chart.component.html',
  styleUrls: ['./performance-chart.component.scss']
})
export class PerformanceChartComponent implements OnInit {
  @Input() performanceChartData: PerformanceChartData = {
    success: [],
    failed: [],
    labels: [],
    integration: 75,
    sdk: 85
  };
  @Input() currentTheme: string = 'light';

  constructor() { }

  ngOnInit(): void {
    this.initChart();
  }

  private initChart(): void {
    // Initialize chart with performanceChartData
  }
}
