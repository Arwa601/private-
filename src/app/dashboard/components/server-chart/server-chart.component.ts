import { Component, Input, OnInit} from '@angular/core';
import { colors } from '../../../consts';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexLegend, ApexStroke, ApexTheme, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';

interface ServerData {
  name: string;
  data: number[];
}

interface ServerChartData {
  data: ServerData[];
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
  labels?: string[];
  legend?: any;
  colors?: string[];
};

@Component({
  selector: 'app-server-chart',
  templateUrl: './server-chart.component.html',
  styleUrls: ['./server-chart.component.scss']
})
export class ServerChartComponent implements OnInit {
  @Input() serverChartData: ServerChartData = {
    data: [],
    labels: []
  };

  public charts: Partial<ChartOptions>[] = [];
  public serverDataTitles: string[] = [];

  constructor() { }

  ngOnInit(): void {
    this.initializeCharts();
  }

  private initializeCharts(): void {
    if (this.serverChartData) {
      this.serverDataTitles = this.serverChartData.data.map(item => item.name);
      
      this.charts = this.serverChartData.data.map(serverData => ({
        series: [{
          name: serverData.name,
          data: serverData.data
        }],
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
          categories: this.serverChartData.labels
        },
        yaxis: {
          show: true
        },
        grid: {
          show: true
        },
        fill: {
          type: 'gradient'
        },
        tooltip: {
          shared: true
        },
        theme: {
          mode: 'light'
        },
        labels: this.serverChartData.labels,
        legend: {
          show: true
        },
        colors: [colors.BLUE, colors.GREEN, colors.PINK]
      }));
    }
  }
}
