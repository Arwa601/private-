import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Notification, NotificationType, NotificationStatus } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);

  constructor() {
    // Load saved notifications from localStorage on init
    this.loadSavedNotifications();
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.notifications.pipe(
      map(notifications => notifications.filter(n => !n.read).length)
    );
  }

  addNotification(
    title: string, 
    message: string, 
    type: NotificationType = 'info',
    status: NotificationStatus = 'completed',
    pipelineId?: string,
    runId?: string
  ) {
    const newNotification: Notification = {
      id: this.generateId(),
      title,
      message,
      type,
      status,
      timestamp: new Date(),
      read: false,
      pipelineId,
      runId
    };

    const current = this.notifications.getValue();
    this.notifications.next([newNotification, ...current]);
    this.saveNotifications();
  }

  markAsRead(notificationId: string) {
    const updated = this.notifications.getValue().map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );
    
    this.notifications.next(updated);
    this.saveNotifications();
  }

  markAllAsRead() {
    const updated = this.notifications.getValue().map(notification => ({
      ...notification,
      read: true
    }));
    
    this.notifications.next(updated);
    this.saveNotifications();
  }

  clearNotifications() {
    this.notifications.next([]);
    this.saveNotifications();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications.getValue()));
  }

  private loadSavedNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        const notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notifications.next(notifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
        localStorage.removeItem('notifications');
      }
    }
  }
}