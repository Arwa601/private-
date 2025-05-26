import { Component, Input, OnInit } from '@angular/core';
import { colors } from '../../../consts';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexStroke, ApexTheme, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';

interface RevenueChartData {
  series: ApexAxisChartSeries;
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
  selector: 'app-revenue-chart',
  templateUrl: './revenue-chart.component.html',
  styleUrls: ['./revenue-chart.component.scss']
})
export class RevenueChartComponent implements OnInit {
  @Input() revenueCharData: RevenueChartData = {
    series: [],
    labels: []
  };
  
  // Create the revenueChart property referenced in the template
  public revenueChart: any;

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
    this.initChart();
    
    // Initialize the revenueChart property for echarts
    this.revenueChart = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        show: false
      },
      series: [
        {
          type: 'pie',
          radius: ['50%', '70%'],
          data: [
            { value: 35, name: 'Group A' },
            { value: 25, name: 'Group B' },
            { value: 20, name: 'Group C' },
            { value: 20, name: 'Group D' }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }

  private initChart(): void {
    if (this.revenueCharData) {
      this.chartOptions.series = this.revenueCharData.series;
      this.chartOptions.xaxis = {
        ...this.chartOptions.xaxis,
        categories: this.revenueCharData.labels
      };
    }
  }
}
