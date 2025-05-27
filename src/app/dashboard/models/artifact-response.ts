export interface ArtifactResponse {
  Artifacts: Array<{
    ArtifactName: string;
    Size: number;
    DownloadUrl: string;
  }>;
  Message: string;
}