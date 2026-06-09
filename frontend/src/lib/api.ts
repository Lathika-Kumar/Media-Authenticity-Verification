export interface ForensicScores {
  visual_artifacts: number;
  audio_manipulation: number;
  lip_sync_variance: number;
}

export interface AnalysisResults {
  authenticity_score: number;
  breakdown: ForensicScores;
  explanation: string;
  model_used: string;
  processed_at: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_name: string;
  file_type: string;
  file_hash: string;
  created_at: string;
  error?: string | null;
  results?: AnalysisResults | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function uploadMediaFile(file: File): Promise<JobStatusResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/verify`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to upload media file.' }));
    throw new Error(errorData.detail || 'Failed to upload media file.');
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch status.' }));
    throw new Error(errorData.detail || `Failed to fetch status for job ${jobId}`);
  }

  return response.json();
}
