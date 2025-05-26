import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AzureProject {
  Id: string;
  Name: string;
  Description?: string;
}

export interface AzurePipeline {
  Id: number;
  Name: string;
  Description?: string;
  Url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AzureDevOpsService {
  // Use the same API endpoint as the admin service
  private apiUrl = `${environment.apiUrl}/api/Admin`;
  
  constructor(private http: HttpClient) {}

  getProjects(): Observable<AzureProject[]> {
    console.log(`Calling: ${this.apiUrl}/projects`);
    // Use the admin API endpoint, which is the same one used in the add-member component
    return this.http.get<AzureProject[]>(`${this.apiUrl}/projects`)
      .pipe(catchError(this.handleError));
  }

  getPipelines(projectName: string): Observable<AzurePipeline[]> {
    console.log(`Calling: ${this.apiUrl}/projects/${projectName}/pipelines/sync`);
    // Use the admin API endpoint, which is the same one used in the add-member component
    return this.http.get<AzurePipeline[]>(`${this.apiUrl}/projects/${projectName}/pipelines/sync`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => error);
  }
}
