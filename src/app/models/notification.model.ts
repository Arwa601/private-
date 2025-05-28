export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationStatus = 'triggered' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  status: NotificationStatus;
  pipelineId?: string;
  runId?: string;
}