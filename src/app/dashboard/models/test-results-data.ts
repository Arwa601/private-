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
  overallPassRate: number;
  features: TestFeatureSummary[];
  recentResults: TestStepResult[];
  lastUpdated: Date;
  runId: number;            
  projectName: string;      
  buildNumber: string;      
  startTime: Date;         
  endTime: Date;         
  duration: number;      
  environment?: string;  
  branch?: string;      
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
  lastCompletedRun?: {     
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
  historicalRuns?: {      
    runId: number;
    timestamp: Date;
    status: string;
    passRate: number;
  }[];
}
export const PIPELINE_CONSTANTS = {
  STATUS_CHECK_INTERVAL: 10000, // 10 seconds
  STUCK_STATE_TIMEOUT: 120000,  // 2 minutes
  MAX_RETRIES: 3
} as const;