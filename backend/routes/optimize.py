import uuid
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from typing import List, Dict, Any

from optimizer.ml_optimizer import optimize_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/optimize", tags=["optimization"])

# In-memory store for async jobs.
# In a real production environment (like Render with multiple workers), 
# this would be in Redis or Postgres so it can be shared across processes.
# For simplicity and synchronous overrides, we will allow returning results directly.
TASKS = {}

@router.post("/")
async def optimize_sync(request: Request):
    """
    Synchronous optimization route.
    Best for deployments where polling fails across different Gunicorn workers.
    Returns results directly instead of a task_id.
    """
    body = await request.json()
    products = body.get('products', [])
    user_id = body.get('user_id', None)
    box_catalog = body.get('box_catalog', None)
    
    if not products:
        raise HTTPException(status_code=400, detail="Must provide products array.")
        
    job_id = str(uuid.uuid4())
    logger.info(f"[{job_id}] Starting SYNC optimization for {len(products)} products (User: {user_id})")
    
    try:
        results = optimize_batch(products, user_id, job_id, box_catalog)
        
        total_optimized = len([r for r in results if r.get("recommended_box_name") != "No Fits"])
        total_savings = sum([r.get("savings_amount", 0) for r in results])
        
        return {
            "status": "complete",
            "job_id": job_id,
            "total_processed": len(results),
            "total_optimized": total_optimized,
            "total_savings": total_savings,
            "results": results
        }
    except Exception as e:
        logger.exception(f"[{job_id}] SYNC optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def optimize_upload(request: Request, background_tasks: BackgroundTasks):
    """
    Asynchronous optimization route.
    Returns a job_id for polling.
    """
    body = await request.json()
    products = body.get('products', [])
    user_id = body.get('user_id', None)
    box_catalog = body.get('box_catalog', None)
    
    if not products:
        raise HTTPException(status_code=400, detail="Must provide products array.")
        
    job_id = str(uuid.uuid4())
    
    TASKS[job_id] = {
        "status": "processing",
        "total": len(products),
        "results": []
    }
    
    # Run in background
    background_tasks.add_task(process_optimization_background, job_id, products, user_id, box_catalog)
    
    return {"job_id": job_id, "total_rows": len(products), "status": "processing"}

def process_optimization_background(job_id: str, products: list, user_id: str, box_catalog: list = None):
    """Background task wrapper."""
    logger.info(f"[{job_id}] Starting ASYNC optimization for {len(products)} products")
    try:
        results = optimize_batch(products, user_id, job_id, box_catalog)
        
        if job_id in TASKS:
            TASKS[job_id]["status"] = "complete"
            TASKS[job_id]["results"] = results
            
        logger.info(f"[{job_id}] Optimization complete. {len(results)} items processed.")
    except Exception as e:
        logger.exception(f"[{job_id}] ASYNC optimization failed: {e}")
        if job_id in TASKS:
            TASKS[job_id]["status"] = "error"

@router.get("/status/{job_id}")
def status(job_id: str):
    """Poll for async task status."""
    task = TASKS.get(job_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task ID not found. Note: In-memory tasks do not persist across multiple workers.")
    return {"status": task["status"], "results": task.get("results", [])}

@router.get("/results/{job_id}")
def get_results(job_id: str, page: int = 1, per_page: int = 1000):
    """Get async task results."""
    task = TASKS.get(job_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task ID not found")
        
    if task["status"] != "complete":
        return {"status": task["status"], "results": []}
        
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    paginated = task["results"][start_idx:end_idx]
    
    return {
        "results": paginated,
        "page": page,
        "per_page": per_page,
        "total_count": len(task["results"])
    }
