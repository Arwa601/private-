import { Pipe, PipeTransform } from '@angular/core';

// Define a simple interface for test results
interface TestResult {
  status: string;
}

@Pipe({
  name: 'passedCount',
  standalone: true
})
export class PassedCountPipe implements PipeTransform {
  transform(results: TestResult[]): number {
    if (!results || !Array.isArray(results)) return 0;
    return results.filter(r => r.status?.toLowerCase() === 'passed').length;
  }
}

@Pipe({
  name: 'failedCount',
  standalone: true
})
export class FailedCountPipe implements PipeTransform {
  transform(results: TestResult[]): number {
    if (!results || !Array.isArray(results)) return 0;
    return results.filter(r => r.status?.toLowerCase() === 'failed').length;
  }
}

@Pipe({
  name: 'skippedCount',
  standalone: true
})
export class SkippedCountPipe implements PipeTransform {
  transform(results: TestResult[]): number {
    if (!results || !Array.isArray(results)) return 0;
    return results.filter(r => r.status?.toLowerCase() === 'skipped').length;
  }
}
