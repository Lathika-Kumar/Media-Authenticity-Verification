from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ForensicScores(BaseModel):
    visual_artifacts: float = Field(..., description="Likelihood of visual artifacts (0-100)")
    audio_manipulation: float = Field(..., description="Likelihood of audio manipulation/voice cloning (0-100)")
    lip_sync_variance: float = Field(..., description="Variance between lip movement and spoken word (0-100)")

class AnalysisResults(BaseModel):
    authenticity_score: float = Field(..., description="Overall confidence that the file is authentic (0-100)")
    breakdown: ForensicScores = Field(..., description="Component forensic analysis breakdown")
    explanation: str = Field(..., description="Detailed textual synthesis explaining the AI's findings")
    model_used: str = Field(..., description="Gemini model or mock framework used for evaluation")
    processed_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when processing completed")

class JobResponse(BaseModel):
    job_id: str = Field(..., description="Unique job tracking identifier")
    status: str = Field(..., description="Current status of the job (pending, processing, completed, failed)")
    file_hash: str = Field(..., description="SHA-256 hash of the uploaded file")

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    file_name: str
    file_type: str
    file_hash: str
    created_at: datetime
    error: Optional[str] = None
    results: Optional[AnalysisResults] = None
