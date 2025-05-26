import { Pipe, PipeTransform } from '@angular/core';
import { TestStepResult } from '../models/test-results-data';

@Pipe({
  name: 'passedCount',
  standalone: true
})
export class PassedCountPipe implements PipeTransform {  transform(results: TestStepResult[]): number {
    return results ? results.filter(r => r.status.toLowerCase() === 'passed').length : 0;
  }
}

@Pipe({
  name: 'failedCount',
  standalone: true
})
export class FailedCountPipe implements PipeTransform {
  transform(results: TestStepResult[]): number {
    return results ? results.filter(r => r.status.toLowerCase() === 'failed').length : 0;
  }
}

@Pipe({
  name: 'skippedCount',
  standalone: true
})
export class SkippedCountPipe implements PipeTransform {
  transform(results: TestStepResult[]): number {
    return results ? results.filter(r => r.status.toLowerCase() === 'skipped').length : 0;
  }
}
