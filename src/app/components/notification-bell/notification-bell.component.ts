import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  template: `
  
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
     
      <div class="notification-list" *ngIf="(notifications$ | async)?.length; else noNotifications">
        <div class="notification-item" *ngFor="let notification of notifications$ | async"
             [class.unread]="!notification.read"
             (click)="onNotificationClick(notification)">
          <div class="notification-icon" [class]="notification.type">
            <svg *ngIf="notification.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg *ngIf="notification.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg *ngIf="notification.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <svg *ngIf="notification.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{notification.title}}</div>
            <div class="notification-message">{{notification.message}}</div>
    
          </div>
        </div>
      </div>

      <ng-template #noNotifications>
        <div class="no-notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            <path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path>
            <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path>
            <path d="M18 8a6 6 0 0 0-9.33-5"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          <p>No notifications</p>
        </div>
      </ng-template>
    </mat-menu>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .notification-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      padding: 8px;
    }

    .badge {
      position: absolute;
      top: 0;
      right: 0;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 12px;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      padding: 12px 16px;
      border-bottom: 1px solid #e9ecef;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: #f8f9fa;
      }

      &.unread {
        background-color: #e8f4fd;

        &:hover {
          background-color: #d9ecfa;
        }
      }
    }

    .notification-icon {
      margin-right: 12px;
      display: flex;
      align-items: flex-start;

      &.success { color: #28a745; }
      &.error { color: #dc3545; }
      &.warning { color: #ffc107; }
      &.info { color: #17a2b8; }
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .notification-message {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .notification-time {
      color: #adb5bd;
      font-size: 12px;
    }

    .no-notifications {
      padding: 32px;
      text-align: center;
      color: #6c757d;

      svg {
        margin-bottom: 8px;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    ::ng-deep .notification-menu {
      max-width: 400px;
      min-width: 350px;

      .mat-mdc-menu-content {
        padding: 0;
      }
    }
  `]
})
export class NotificationBellComponent implements OnInit {
  notifications$: Observable<any[]>;
  unreadCount$: Observable<number>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.getNotifications();
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit() {}

  onNotificationClick(notification: any) {
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }
}