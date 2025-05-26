import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';           

import { environment } from '../../../environments/environment';
import { QAUser } from '../../models/qa-user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private baseApiUrl = `${environment.apiUrl}/api/Admin`;
    private usersApiUrl = `${this.baseApiUrl}/all-users`;

    constructor(private http: HttpClient) { }    getAllUsers(): Observable<QAUser[]> {
        return this.http.get<QAUser[]>(this.usersApiUrl).pipe(
            map((users: QAUser[]) => {
                // Log received data for debugging
                console.log('API returned users:', users);
                
                users.forEach((user: QAUser) => {
                  
                    if (!user.Id) {
                        console.warn(`User ${user.Firstname} ${user.Lastname} (${user.Email}) has no ID in API response`);
                    }
                });
                
                return users;
            })
        );
    }
    
    // Generate a unique identifier for users without IDs
    removeUser(userId: string): Observable<any> {
        console.log(`Removing user with ID: ${userId}`);
        return this.http.delete(`${this.baseApiUrl}/remove-user/${userId}`);
    }    updatePermissions(userId: string, pipelineId: number, permissions: any): Observable<any> {
        if (!userId) {
            console.error('Invalid userId provided to updatePermissions:', userId);
            throw new Error('User ID is required for updatePermissions');
        }
        
        if (!pipelineId && pipelineId !== 0) {
            console.error('Invalid pipelineId provided to updatePermissions:', pipelineId);
            throw new Error('Pipeline ID is required for updatePermissions');
        }
          // Explicit conversion of pipelineId to number to avoid type issues
        const numericPipelineId = Number(pipelineId);
        
        console.log(`Preparing update permissions request:
        - userId: ${userId} (type: ${typeof userId})
        - pipelineId: ${numericPipelineId} (original: ${pipelineId}, type: ${typeof numericPipelineId})
        - permissions: ${JSON.stringify(permissions)}`);
        
        const payload = {
            PipelineId: numericPipelineId,
            Permissions: {
                CanViewHistory: Boolean(permissions.CanViewHistory),
                CanTrigger: Boolean(permissions.CanTrigger),
                CanViewResults: Boolean(permissions.CanViewResults),
                CanDownloadReport: Boolean(permissions.CanDownloadReport)
            }
        };          
        const url = `${this.baseApiUrl}/change-access/${userId}`;
        console.log(`Sending PUT request to: ${url}`);
        console.log(`Payload: ${JSON.stringify(payload)}`);
        
    
        return this.http.put(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
