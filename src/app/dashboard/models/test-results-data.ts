export interface TestStepResult{
  Id: string;
  ReportId: string;
  Feature: string;
  StepName: string;
  Status: 'PASSED' | 'FAILED' ;
  Scenario: string;
  ExceptionType?: string;
  ExceptionMessage?: string;
}

export interface TestFeatureSummary {
  featureName: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  duration: number;
}

export interface TestResultsSummary {
  totalFeatures: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  overallPassRate: number;
  features: TestFeatureSummary[];
  recentResults: TestStepResult[];
  lastUpdated: Date;
  runId: number;            // Added to track which pipeline run
  projectName: string;      // Added to track which project
  buildNumber: string;      // Added to track build number
  startTime: Date;         // Added to track when the tests started
  endTime: Date;          // Added to track when the tests completed
  duration: number;       // Added to track total run duration
  environment?: string;  // Added to track test environment
  branch?: string;      // Added to track source code branch
}

export interface TestResult {
  id?: string;
  reportId?: string;
  feature: string;
  scenario: string;
  stepName: string;
  status: string;
  duration: number;
  timestamp: Date;
  runId: number;
  exceptionType?: string;
  exceptionMessage?: string;
}

export interface PipelineStatus {
  isRunning: boolean;
  currentStage?: string;
  progress?: number;
  startTime?: Date;
  estimatedDuration?: number;
  lastCompletedRun?: {     // Added to track last completed run
    runId: number;
    status: string;
    timestamp: Date;
    testsSummary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  };
  historicalRuns?: {      // Added to track historical runs
    runId: number;
    timestamp: Date;
    status: string;
    passRate: number;
  }[];
}
