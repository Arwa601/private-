import { Injectable } from '@angular/core';

export interface PipelineExecution {
  projectName: string;
  pipelineId: number;
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

  clearExecution(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing pipeline execution:', error);
    }
  }
}