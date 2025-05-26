import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AzureProject {
  Id: string; 
  Name: string;
}

export interface AzurePipeline {
  Id: number;
  Name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AzureDevOpsService {
  private apiUrl = `${environment.apiUrl}/api/Admin`;

  constructor(private http: HttpClient) { }

  getProjects(): Observable<AzureProject[]> {
    console.log(`Calling: ${this.apiUrl}/projects`);
    return this.http.get<AzureProject[]>(`${this.apiUrl}/projects`);
  }

  getPipelines(projectName: string): Observable<AzurePipeline[]> {
    console.log(`Calling: ${this.apiUrl}/projects/${projectName}/pipelines/sync`);
    return this.http.get<AzurePipeline[]>(`${this.apiUrl}/projects/${projectName}/pipelines/sync`);
  }

  addMember(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add-user-access`, payload);
  }
}