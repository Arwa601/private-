import { Injectable } from '@angular/core';

export interface PipelineExecution {
  projectName: string;
  pipelineId: number;
  pipelineName: string;
  runId: number;
  status: {
    isRunning: boolean;
    progress?: number;
    currentStage?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PipelineStorageService {
  private readonly STORAGE_KEY = 'pipeline_execution';
  private readonly CURRENT_PIPELINE_KEY = 'current_pipeline_name';

  constructor() {}

  saveExecution(execution: PipelineExecution): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(execution));
    } catch (error) {
      console.error('Error saving pipeline execution:', error);
    }
  }

  getExecution(): PipelineExecution | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as PipelineExecution;
      }
    } catch (error) {
      console.error('Error retrieving pipeline execution:', error);
    }
    return null;
  }

  setCurrentPipelineName(pipelineName: string): void {
    try {
      localStorage.setItem(this.CURRENT_PIPELINE_KEY, pipelineName);
    } catch (error) {
      console.error('Error saving current pipeline name:', error);
    }
  }

  getCurrentPipelineName(): string {
    try {
      return localStorage.getItem(this.CURRENT_PIPELINE_KEY) || 'Unknown Pipeline';
    } catch (error) {
      console.error('Error retrieving current pipeline name:', error);
      return 'Unknown Pipeline';
    }
  }

  clearExecution(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing pipeline execution:', error);
    }
  }
}