import uuid
import logging
from fastapi import APIRouter, HTTPException, Request

from optimizer.ml_optimizer import optimize_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/optimize", tags=["optimization"])


@router.post("/")
async def optimize_sync(request: Request):
    """
    Synchronous optimization endpoint.
    Accepts products + box_catalog, runs optimization, returns full results.
    """
    body = await request.json()
    products = body.get("products", [])
    user_id = body.get("user_id", None)
    box_catalog = body.get("box_catalog", None)

    if not products:
        raise HTTPException(status_code=400, detail="No products provided.")

    job_id = str(uuid.uuid4())
    logger.info(f"[{job_id}] Optimize request: {len(products)} products, user={user_id}")

    try:
        results = optimize_batch(products, user_id, job_id, box_catalog)

        total_optimized = len([r for r in results if r.get("is_optimized", False)])
        total_savings = round(sum(r.get("savings_amount", 0) for r in results), 2)

        return {
            "status": "complete",
            "job_id": job_id,
            "total_processed": len(results),
            "total_optimized": total_optimized,
            "total_savings": total_savings,
            "results": results
        }
    except Exception as e:
        logger.exception(f"[{job_id}] Optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
