import os
import uuid
import hashlib
import logging
import asyncio
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import aiofiles

from app.schemas import JobResponse, JobStatusResponse, AnalysisResults, ForensicScores
from app import cache
from app import gemini_service

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api-main")

# Initialize FastAPI app
app = FastAPI(
    title="Media Authenticity Verification API",
    description="Backend API for high-traffic real-time deepfake and voice clone detection.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage directories
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))

@app.on_event("startup")
async def startup_event():
    """Ensures uploads directory exists on start."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    logger.info(f"Local file storage initialized at: {UPLOAD_DIR}")

async def process_media_analysis(job_id: str, file_path: str, file_type: str, file_hash: str, file_name: str):
    """Background task to run Gemini analysis and update cache."""
    logger.info(f"Starting async processing for Job {job_id}")
    
    # 1. Update status to 'processing'
    job_data = cache.get_job(job_id)
    if not job_data:
        logger.error(f"Job {job_id} not found in cache before processing.")
        return
        
    job_data["status"] = "processing"
    cache.set_job(job_id, job_data)
    
    try:
        # 2. Call Gemini Service (could be mock or live)
        analysis_data = await gemini_service.analyze_media(file_path, file_type, file_hash, file_name)
        
        # 3. Retrieve updated job data and populate results
        job_data = cache.get_job(job_id)
        if job_data:
            job_data["status"] = "completed"
            job_data["results"] = {
                "authenticity_score": analysis_data["authenticity_score"],
                "breakdown": {
                    "visual_artifacts": analysis_data["visual_artifacts"],
                    "audio_manipulation": analysis_data["audio_manipulation"],
                    "lip_sync_variance": analysis_data["lip_sync_variance"]
                },
                "explanation": analysis_data["explanation"],
                "model_used": analysis_data["model_used"],
                "processed_at": datetime.utcnow().isoformat()
            }
            # Update job cache
            cache.set_job(job_id, job_data)
            
            # Map hash to job_id for deduplication
            cache.set_hash(file_hash, job_id)
            logger.info(f"Successfully processed Job {job_id}. Cached results for hash: {file_hash}")
            
    except Exception as e:
        logger.error(f"Error during async analysis of Job {job_id}: {e}")
        job_data = cache.get_job(job_id)
        if job_data:
            job_data["status"] = "failed"
            job_data["error"] = str(e)
            cache.set_job(job_id, job_data)

@app.post("/api/verify", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def verify_media(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...)
):
    """
    Accepts media file, computes hash, checks for deduplication.
    If cached, returns results immediately. Otherwise, initiates async processing.
    """
    logger.info(f"Received verification request: {file.filename}")
    
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".mp4", ".mp3", ".wav"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: .mp4, .mp3, .wav"
        )
        
    # 2. Compute SHA-256 hash in chunks to prevent high memory usage
    sha256 = hashlib.sha256()
    temp_job_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{temp_job_id}{ext}")
    
    try:
        async with aiofiles.open(temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                sha256.update(chunk)
                await buffer.write(chunk)
    except Exception as err:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.error(f"Failed to write uploaded file: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest uploaded media."
        )

    file_hash = sha256.hexdigest()
    logger.info(f"Computed SHA-256 for '{file.filename}': {file_hash}")
    
    # 3. Deduplication Check
    cached_job = cache.get_job_by_hash(file_hash)
    if cached_job:
        logger.info(f"Duplicate upload detected. Returning cached results for Job {cached_job['job_id']}")
        # Clean up temporary uploaded file as it's a duplicate
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return cached_job

    # 4. New Job Setup
    job_id = str(uuid.uuid4())
    final_filename = f"{job_id}{ext}"
    final_path = os.path.join(UPLOAD_DIR, final_filename)
    
    # Rename temp file to permanent local storage path
    try:
        os.rename(temp_path, final_path)
    except Exception as err:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        logger.error(f"Failed to save file: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to move file to storage."
        )

    job_data = {
        "job_id": job_id,
        "status": "pending",
        "file_name": file.filename,
        "file_type": file.content_type or "application/octet-stream",
        "file_hash": file_hash,
        "created_at": datetime.utcnow().isoformat(),
        "error": None,
        "results": None
    }
    
    # Cache initial job data
    cache.set_job(job_id, job_data)
    
    # 5. Enqueue background task
    background_tasks.add_task(
        process_media_analysis, 
        job_id, 
        final_path, 
        file.content_type or "application/octet-stream", 
        file_hash,
        file.filename
    )
    
    logger.info(f"Created Job {job_id} for '{file.filename}'. Async analysis started.")
    return job_data

@app.get("/api/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Retrieves current job status and forensic analysis results."""
    job_data = cache.get_job(job_id)
    if not job_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found."
        )
    return job_data

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "cache_type": cache.client.__class__.__name__
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
