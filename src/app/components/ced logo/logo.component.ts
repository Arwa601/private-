import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class LogoComponent {
  @Input() src: string = 'assets/images/ced-logo.svg';
  @Input() alt: string = 'Logo';
}