import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from typing import List, Dict, Any
from optimizer.ml_optimizer import optimize_batch
from supabase import create_client
import os
import datetime

router = APIRouter(prefix="/optimize", tags=["optimization"])

# In-memory store for background jobs (Use Redis/DB in production)
TASKS: Dict[str, Dict[str, Any]] = {}

supabase_url = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

supabase = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

def process_optimization_background(job_id: str, products: list, user_id: str):
    """Background task to run optimization and bulk insert results"""
    try:
        # Run optimization
        results = optimize_batch(products, user_id, job_id)
        
        # Insert to optimization_results in chunks of 100
        if supabase:
            for i in range(0, len(results), 100):
                chunk = results[i:i+100]
                supabase.table("optimization_results").insert(chunk).execute()
                
                # Option to map and insert to orders table if needed
                orders_chunk = []
                for r in chunk:
                    orders_chunk.append({
                        "user_id": user_id,
                        "session_id": job_id,
                        "product_name": r["product_name"],
                        "sku": r["sku"],
                        "status": "optimized"
                    })
                # We won't insert to orders directly here to avoid duplicate logic unless instructed 
                # (The user prompt mentioned: B) Bulk insert ALL results to orders table).
                # Wait, let's insert to orders.
                if orders_chunk:
                    supabase.table("orders").insert(orders_chunk).execute()
        
        TASKS[job_id]["status"] = "complete"
        TASKS[job_id]["processed_rows"] = len(results)
        TASKS[job_id]["completed_at"] = datetime.datetime.now().isoformat()
    except Exception as e:
        print(f"Error in background task {job_id}: {e}")
        TASKS[job_id]["status"] = "error"
        TASKS[job_id]["error_msg"] = str(e)


@router.post("/")
@router.post("/upload")
async def optimize_upload(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    products = body.get('products', [])
    user_id = body.get('user_id', None)
    
    if not products:
        raise HTTPException(status_code=400, detail="Must provide products array.")
    
    job_id = str(uuid.uuid4())
    print(f"Received {len(products)} rows for optimization, job_id={job_id}")
    
    TASKS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "total_rows": len(products),
        "processed_rows": 0,
        "created_at": datetime.datetime.now().isoformat()
    }
    
    background_tasks.add_task(process_optimization_background, job_id, products, user_id)
    
    return {"job_id": job_id, "total_rows": len(products), "status": "processing"}


@router.get("/status/{job_id}")
def status(job_id: str):
    task = TASKS.get(job_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task ID not found")
    
    progress_pct = 0
    if task["total_rows"] > 0:
        progress_pct = round((task["processed_rows"] / task["total_rows"]) * 100)
    
    return {
        "job_id": task["job_id"],
        "status": task["status"],
        "total_rows": task["total_rows"],
        "processed_rows": task["processed_rows"],
        "progress_pct": progress_pct if task["status"] != "complete" else 100,
        "error_msg": task.get("error_msg", "")
    }

@router.get("/results/{job_id}")
def get_results(job_id: str, page: int = 1, per_page: int = 50):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Query optimization_results
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page - 1
    
    # Get total count
    count_res = supabase.table("optimization_results").select("id", count="exact").eq("session_id", job_id).execute()
    total_count = count_res.count if count_res.count else 0
    
    res = supabase.table("optimization_results").select("*").eq("session_id", job_id).order("sku").range(start_idx, end_idx).execute()
    
    return {
        "results": res.data,
        "total_count": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_count + per_page - 1) // per_page
    }
