import json
import redis
import logging
from typing import Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("platform-cache")

class InMemoryCache:
    """Fallback in-memory cache simulating Redis operations."""
    def __init__(self):
        self._data = {}
        logger.warning("FALLBACK: Initialized in-memory cache store. Persistence and scaling will be limited.")

    def get(self, key: str) -> Optional[str]:
        return self._data.get(key)

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        # We store the value as string to match Redis decode_responses behavior
        self._data[key] = str(value)
        return True

    def exists(self, key: str) -> bool:
        return key in self._data

# Try to instantiate a Redis client and verify connection
try:
    # Keep socket_connect_timeout low so that start-up does not hang when Redis is absent
    client = redis.Redis(
        host="localhost", 
        port=6379, 
        db=0, 
        socket_connect_timeout=1.5, 
        socket_timeout=1.5,
        decode_responses=True
    )
    # Ping Redis server to confirm connectivity
    client.ping()
    logger.info("SUCCESS: Connected to Redis at localhost:6379")
except Exception as e:
    logger.warning(f"Redis not available ({e}). Falling back to InMemoryCache.")
    client = InMemoryCache()

def set_job(job_id: str, data: dict, ex: int = 3600):
    """Saves job details under 'job:{job_id}'."""
    try:
        client.set(f"job:{job_id}", json.dumps(data), ex=ex)
    except Exception as e:
        logger.error(f"Error writing job {job_id} to cache: {e}")

def get_job(job_id: str) -> Optional[dict]:
    """Retrieves job details for 'job:{job_id}'."""
    try:
        val = client.get(f"job:{job_id}")
        if val:
            return json.loads(val)
    except Exception as e:
        logger.error(f"Error reading job {job_id} from cache: {e}")
    return None

def set_hash(file_hash: str, job_id: str, ex: int = 86400):
    """Maps a SHA-256 file hash to its completed job_id for deduplication."""
    try:
        client.set(f"hash:{file_hash}", job_id, ex=ex)
    except Exception as e:
        logger.error(f"Error writing hash mapping to cache: {e}")

def get_job_by_hash(file_hash: str) -> Optional[dict]:
    """Checks for a duplicate upload by hashing and returns its job info if cached."""
    try:
        job_id = client.get(f"hash:{file_hash}")
        if job_id:
            logger.info(f"Deduplication hit: Hash {file_hash} resolved to Job ID {job_id}")
            return get_job(job_id)
    except Exception as e:
        logger.error(f"Error resolving hash {file_hash}: {e}")
    return None
