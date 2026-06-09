# Media Authenticity Verification

A full-stack proof-of-concept for uploading media files and checking them for deepfake or voice-clone authenticity using a Python FastAPI backend and a Next.js frontend.

## Features

- Secure media upload support for `.mp4`, `.mp3`, and `.wav` files.
- SHA-256 content hashing for duplicate detection and cache reuse.
- Asynchronous background analysis with FastAPI `BackgroundTasks`.
- Real-time job status and forensic result retrieval via API.
- Frontend dashboard for upload progress and visualization of verification outcomes.
- Local storage and caching of analysis results for faster repeat lookups.
- Modular architecture with separate backend API, schema validation, and frontend UI.

## Project Structure

- `backend/` - FastAPI service, media upload endpoint, async analysis workflow, and local caching.
- `frontend/` - Next.js application for file upload, dashboard display, and results visualization.
- `backend/app/` - Python application modules, including API routes, schemas, cache logic, and Gemini service integration.

## Backend

### Requirements

- Python 3.11+ recommended

### Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Run

```bash
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

- `POST /api/verify` - Upload a media file (`.mp4`, `.mp3`, or `.wav`) to start verification.
- `GET /api/status/{job_id}` - Check the status and results of an analysis job.
- `GET /health` - Simple health check endpoint.

## Frontend

### Install

```bash
cd frontend
npm install
```

### Run

```bash
cd frontend
npm run dev
```

### Notes

- The frontend is configured to run with Next.js and React.
- Replace the backend origin in the frontend API calls if running the backend on a custom host or port.

## Development Notes

- Uploaded files are stored in `backend/uploads/`.
- The backend uses SHA-256 deduplication for repeated uploads.
- Background processing is handled by FastAPI `BackgroundTasks`.

## License

This repository does not include a license file. Add one if needed for open source redistribution.
