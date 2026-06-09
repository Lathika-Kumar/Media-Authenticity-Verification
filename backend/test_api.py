import time
import requests

API_URL = "http://127.0.0.1:8000"

def run_e2e_test():
    print("=== STARTING MEDIA PLATFORM API TEST ===")
    
    # 1. Create a temporary MP3 file payload
    file_content = b"Mock MP3 Audio Frequencies content data string " + str(time.time()).encode()
    file_name = "test_audio_sample.mp3"
    
    # Let's save the payload
    files = {"file": (file_name, file_content, "audio/mpeg")}
    
    # 2. Upload to verify endpoint
    print(f"\n1. Ingesting new media: '{file_name}'...")
    response = requests.post(f"{API_URL}/api/verify", files=files)
    
    if response.status_code != 202:
        print(f"FAILED Ingestion: Status {response.status_code}")
        print(response.text)
        return
        
    data = response.json()
    job_id = data["job_id"]
    file_hash = data["file_hash"]
    initial_status = data["status"]
    
    print(f"SUCCESS Ingestion: Job ID = {job_id}")
    print(f"SHA-256 Hash = {file_hash}")
    print(f"Initial Status = {initial_status}")
    
    # 3. Poll Status
    print(f"\n2. Polling status for Job {job_id}...")
    completed = False
    for i in range(15):
        time.sleep(1.0)
        status_resp = requests.get(f"{API_URL}/api/status/{job_id}")
        if status_resp.status_code != 200:
            print(f"Error checking status: {status_resp.status_code}")
            break
            
        status_data = status_resp.json()
        current_status = status_data["status"]
        print(f"   [Tick {i+1}] Status = {current_status}")
        
        if current_status == "completed":
            completed = True
            print("\nSUCCESS: Forensic analysis complete!")
            print("Forensic Metrics:")
            print(f"   - Authenticity Score: {status_data['results']['authenticity_score']}%")
            print(f"   - Visual Artifacts Probability: {status_data['results']['breakdown']['visual_artifacts']}%")
            print(f"   - Audio Manipulation Probability: {status_data['results']['breakdown']['audio_manipulation']}%")
            print(f"   - Lip-Sync Variance Probability: {status_data['results']['breakdown']['lip_sync_variance']}%")
            print(f"   - Engine Explanation: {status_data['results']['explanation']}")
            print(f"   - Analysis Engine: {status_data['results']['model_used']}")
            break
        elif current_status == "failed":
            print(f"FAILED: {status_data['error']}")
            break
            
    if not completed:
        print("Pipeline polling timed out or failed.")
        return

    # 4. Re-upload identical payload to test Deduplication Engine
    print("\n3. Testing Deduplication Engine: Re-uploading identical file...")
    # Reset files payload pointer
    files = {"file": (file_name, file_content, "audio/mpeg")}
    dedup_start = time.time()
    dedup_resp = requests.post(f"{API_URL}/api/verify", files=files)
    dedup_end = time.time()
    
    if dedup_resp.status_code != 202:
        # FastAPI returns 202 for verify route
        pass
        
    dedup_data = dedup_resp.json()
    print(f"   Response status: {dedup_data['status']}")
    print(f"   Cached Job ID: {dedup_data['job_id']}")
    print(f"   Deduplication check completed in: {(dedup_end - dedup_start) * 1000:.2f}ms")
    
    if dedup_data['status'] == 'completed':
        print("\nSUCCESS: Deduplication Engine returned cached results instantly!")
    else:
        print("\nFAILED: Deduplication Engine did not return completed cached job.")
        
    print("\n=== E2E TESTING COMPLETE ===")

if __name__ == "__main__":
    # Wait for server to be fully ready
    time.sleep(1.0)
    run_e2e_test()
