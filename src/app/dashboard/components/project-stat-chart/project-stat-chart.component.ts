import { Component, Input, OnInit } from '@angular/core';
import { colors } from '../../../consts';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexStroke, ApexTheme, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';

interface ProjectTimeData {
  name: string;
  data: number[];
}

interface ProjectStatData {
  lightBlue: ProjectTimeData[];
  singApp: ProjectTimeData[];
  rns: ProjectTimeData[];
  labels: string[];
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  fill: ApexFill;
  yaxis: ApexYAxis;
  theme: ApexTheme;
  tooltip: ApexTooltip;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-project-stat-chart',
  templateUrl: './project-stat-chart.component.html',
  styleUrls: ['./project-stat-chart.component.scss']
})
export class ProjectStatChartComponent implements OnInit {
  @Input() projectsStatsData: ProjectStatData = {
    lightBlue: [],
    singApp: [],
    rns: [],
    labels: []
  };

  public selectedStatsLightBlueData: ProjectTimeData = {
    name: '',
    data: []
  };

  public selectedStatsSingAppData: ProjectTimeData = {
    name: '',
    data: []
  };

  public selectedStatsRNSData: ProjectTimeData = {
    name: '',
    data: []
  };

  public chartOptions: Partial<ChartOptions> = {
    series: [],
    chart: {
      height: 350,
      type: 'area',
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth'
    },
    xaxis: {
      type: 'category',
      categories: []
    },
    tooltip: {
      shared: true
    },
    theme: {
      mode: 'light'
    }
  };

  constructor() { }

  ngOnInit(): void {
    this.initializeChart();
  }

  private initializeChart(): void {
    if (this.projectsStatsData) {
      this.selectedStatsLightBlueData = this.projectsStatsData.lightBlue[0] || { name: '', data: [] };
      this.selectedStatsSingAppData = this.projectsStatsData.singApp[0] || { name: '', data: [] };
      this.selectedStatsRNSData = this.projectsStatsData.rns[0] || { name: '', data: [] };

      this.chartOptions.series = [
        {
          name: this.selectedStatsLightBlueData.name,
          data: this.selectedStatsLightBlueData.data
        },
        {
          name: this.selectedStatsSingAppData.name,
          data: this.selectedStatsSingAppData.data
        },
        {
          name: this.selectedStatsRNSData.name,
          data: this.selectedStatsRNSData.data
        }
      ];

      this.chartOptions.xaxis = {
        ...this.chartOptions.xaxis,
        categories: this.projectsStatsData.labels
      };
    }
  }
}
