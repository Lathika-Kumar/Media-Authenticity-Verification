# Intel-Verify | Media Authenticity Verification Platform

Intel-Verify is a military-grade, real-time AI forensic diagnostic platform designed for verifying audio and video authenticity. It runs on a FastAPI backend powered by the Gemini Multimodal engine and a Next.js frontend built with Tailwind CSS.

---

## Architecture Overview

1. **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS (v4).
2. **Backend**: FastAPI (Python 3.10+) serving the multimodal analysis and validation APIs.
3. **Forensics Engine**: Integrates with Google Gemini 1.5 Flash (for live multimodal files) or falls back to a deterministic local diagnostic simulation.
4. **Cache & Queue Registry**: Uses Redis for file hash deduplication (falls back automatically to an in-memory cache if Redis is not running).

---

## Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: `v18.0.0` or higher (recommended: LTS)
- **Python**: `3.10` or higher
- **Redis** *(Optional)*: Runs automatically on `localhost:6379` if detected, otherwise falls back to a local memory cache database.

---

## Quick Start Setup

Follow these instructions to run the backend and frontend services.

### 1. Run the FastAPI Backend

#### Windows (PowerShell)
```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the Uvicorn development server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### macOS / Linux (Terminal)
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Activate the virtual environment
source .venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the Uvicorn development server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend server will run at: **`http://localhost:8000`**
- Interactive Swagger API docs: `http://localhost:8000/docs`
- Health check endpoint: `http://localhost:8000/health`

---

### 2. Run the Next.js Frontend

#### On all operating systems:
```bash
# 1. Open a new terminal and navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Next.js development server
npm run dev
```

The frontend application will run at: **`http://localhost:3000`**

---

## Running Live Gemini Forensics (Optional)

By default, the platform runs in a deterministic **forensic simulation mode** if no API key is set. To enable live multimodal AI audits:

1. Obtain a Gemini API Key from Google AI Studio.
2. In the `backend` environment, set the variable:
   ```bash
   # Linux/macOS
   export GEMINI_API_KEY="your_api_key_here"

   # Windows PowerShell
   $env:GEMINI_API_KEY="your_api_key_here"
   ```
3. Restart the backend server. The engine will automatically detect the key and switch to live Gemini multimodal audits.

---

## Ingesting Mock Payload Files

The repository includes two pre-configured mock media payloads to verify threat detection:
- **`mock_deepfake_media.wav`**: Simulates a high-risk deepfake payload (triggers the manipulated media alert).
- **`mock_authentic_media.wav`**: Simulates an authentic clean payload (triggers the verified authentic banner).
