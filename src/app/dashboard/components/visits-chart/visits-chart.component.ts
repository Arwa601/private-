import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { colors } from '../../../consts';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexStroke, ApexTheme, ApexTitleSubtitle, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import ApexCharts from 'apexcharts';

interface VisitsChartData {
  series: ApexAxisChartSeries;
  labels: string[];
  all: number;
  registration: number;
  signOut: number;
  rate: number;
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
  selector: 'app-visits-chart',
  templateUrl: './visits-chart.component.html',
  styleUrls: ['./visits-chart.component.scss']
})
export class VisitsChartComponent implements OnInit, OnChanges {
  @Input() visitsChartData: VisitsChartData = {
    series: [],
    labels: [],
    all: 0,
    registration: 0,
    signOut: 0,
    rate: 0
  };
  @Input() currentTheme: string = 'light';
  @ViewChild('chart') chart!: ElementRef;

  private chartObj: any;

  constructor() { }

  ngOnInit(): void {
    this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentTheme']?.currentValue && this.chartObj) {
      this.updateChartTheme();
    }
  }

  private initChart(): void {
    if (this.chart?.nativeElement && this.visitsChartData) {
      this.chartObj = new ApexCharts(this.chart.nativeElement, {
        series: this.visitsChartData.series,
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
          categories: this.visitsChartData.labels
        },
        yaxis: {
          labels: {
            formatter: (val: number): string => {
              return val.toString();
            }
          }
        },
        tooltip: {
          shared: true
        },
        theme: {
          mode: this.currentTheme as 'light' | 'dark'
        }
      });

      this.chartObj.render();
    }
  }

  private updateChartTheme(): void {
    if (this.chartObj) {
      this.chartObj.updateOptions({
        theme: {
          mode: this.currentTheme as 'light' | 'dark'
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.chartObj) {
      this.chartObj.destroy();
    }
  }
}
