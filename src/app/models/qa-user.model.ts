export interface QAPipelinePermission {
    CanViewHistory: boolean;
    CanTrigger: boolean;
    CanViewResults: boolean;
    CanDownloadReport: boolean;
}

export interface QAPipeline {
    Id: number;
    Name: string;
    Permissions: QAPipelinePermission;
}

export interface QAProject {
    Id: string;
    Name: string;
    Pipelines: QAPipeline[];
}

export interface QAUser {
    Id?: string; 
    Firstname: string;
    Lastname: string;
    Password: string;
    Email: string;
    Role: string;
    Status: string;
    Projects: QAProject[];
}