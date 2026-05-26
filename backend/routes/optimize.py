import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from models.schemas import OptimizationInput, OptimizationResponse, BoxSpec
from engine.xgboost_engine import run_xgboost_optimization
from typing import List, Dict, Any
from fastapi.responses import JSONResponse
import threading

router = APIRouter(prefix="/optimize", tags=["optimization"])

# In-memory store for demo background jobs (should use Redis/DB in prod)
TASKS: Dict[str, Dict[str, Any]] = {}

@router.post("/")
async def optimize_batch(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    products = body.get('products', [])
    box_catalog = body.get('box_catalog', [])
    user_id = body.get('user_id', None)
    file_name = body.get('file_name', '')
    N = len(products)
    if not products or not box_catalog:
        raise HTTPException(status_code=400, detail="Must provide both products and box_catalog arrays.")

    def build_opt_input(product, box_catalog):
        return OptimizationInput(
            product_name=product.get('product_name', ''),
            product_id=product.get('sku', ''),
            length_cm=product.get('length_cm', 0),
            width_cm=product.get('width_cm', 0),
            height_cm=product.get('height_cm', 0),
            weight_kg=product.get('weight_kg', 0),
            fragility=product.get('fragility', 'low').lower(),
            quantity=product.get('quantity', 1),
            category=product.get('category', 'general'),
            destination_zone=product.get('zone', 2),
            shipping_method=product.get('shipping_method', 'standard'),
            available_boxes=[
                # Acceptable fields; extend as needed
                BoxSpec(**box) for box in box_catalog
            ],
        )

    def run_batch_and_store(task_id, batch: List[Dict[str, Any]], box_catalog):
        results = []
        for product in batch:
            try:
                opt_input = build_opt_input(product, box_catalog)
                result = run_xgboost_optimization(opt_input)
                results.append(result.model_dump())
            except Exception as e:
                results.append({"sku": product.get('sku'), "error": str(e)})
        TASKS[task_id] = {"status": "complete", "results": results}

    # For large workloads, run background
    if N > 200:
        tid = str(uuid.uuid4())
        TASKS[tid] = {"status": "processing", "results": None}
        thread = threading.Thread(target=run_batch_and_store, args=(tid, products, box_catalog), daemon=True)
        thread.start()
        return {"task_id": tid, "status": "pending"}

    # Otherwise, process synchronously
    results = []
    for product in products:
        try:
            opt_input = build_opt_input(product, box_catalog)
            result = run_xgboost_optimization(opt_input)
            results.append(result.model_dump())
        except Exception as e:
            results.append({"sku": product.get('sku'), "error": str(e)})
    return {"results": results, "status": "complete"}

@router.get("/status/{task_id}")
def status(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task ID not found")
    return task
