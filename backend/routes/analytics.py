from fastapi import APIRouter, HTTPException
from collections import defaultdict
from datetime import datetime
from supabase import create_client
import os
import time

router = APIRouter(prefix="/api/dashboard", tags=["analytics"])

supabase_url = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

supabase = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

# Simple in-memory cache
ANALYTICS_CACHE = {}
CACHE_TTL = 300  # 5 minutes

@router.get("/analytics")
async def get_analytics(user_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    now = time.time()
    if user_id in ANALYTICS_CACHE:
        cached_data, timestamp = ANALYTICS_CACHE[user_id]
        if now - timestamp < CACHE_TTL:
            return cached_data

    # Stat cards
    res = supabase.table("optimization_results").select(
        "savings_amount, volume_utilization, created_at, recommended_carrier, recommended_box_name"
    ).eq("user_id", user_id).execute()
    
    results = res.data or []
    
    total_skus = len(results)
    total_savings = sum(r.get("savings_amount") or 0 for r in results if (r.get("savings_amount") or 0) > 0)
    avg_fit = sum(r.get("volume_utilization") or 0 for r in results) / max(total_skus, 1)
    
    # Monthly runs (last 6 months)
    monthly = defaultdict(lambda: {"count": 0, "savings": 0})
    for r in results:
        # created_at format: "2026-05-27T07:11:43.123Z"
        month = r["created_at"][:7] if r.get("created_at") else "Unknown"
        monthly[month]["count"] += 1
        monthly[month]["savings"] += (r.get("savings_amount") or 0)
    
    # Box distribution
    box_dist = defaultdict(int)
    for r in results:
        box_name = r.get("recommended_box_name")
        if box_name:
            box_dist[box_name] += 1
    
    # Carrier breakdown
    carrier_dist = defaultdict(lambda: {"count": 0, "savings": 0})
    for r in results:
        c = r.get("recommended_carrier") or "Generic"
        carrier_dist[c]["count"] += 1
        carrier_dist[c]["savings"] += (r.get("savings_amount") or 0)
    
    # Savings trend (daily cumulative, last 30 days)
    daily_savings = defaultdict(float)
    for r in results:
        day = r["created_at"][:10] if r.get("created_at") else "Unknown"
        daily_savings[day] += (r.get("savings_amount") or 0)
    
    # CO2: 1 kg shipping ≈ 0.21 kg CO2; savings in ₹ / 50 ≈ kg saved
    co2_saved = (total_savings / 50) * 0.21
    
    response_data = {
        "total_skus_optimized": total_skus,
        "total_savings": round(total_savings, 2),
        "avg_cost_reduction_pct": round((total_savings / max(total_skus * 100, 1)) * 100, 1),
        "avg_fit_score": round(avg_fit, 1),
        "engine_uptime": 99.9,
        "co2_saved_kg": round(co2_saved, 2),
        "monthly_runs": [{"month": k, **v} for k, v in sorted(monthly.items())[-6:]],
        "box_distribution": [{"name": k, "count": v} for k, v in sorted(box_dist.items(), key=lambda x: -x[1])[:8]],
        "carrier_breakdown": [{"carrier": k, **v} for k, v in carrier_dist.items()],
        "savings_trend": [{"date": k, "savings": v} for k, v in sorted(daily_savings.items())[-30:]],
    }
    
    ANALYTICS_CACHE[user_id] = (response_data, now)
    return response_data
