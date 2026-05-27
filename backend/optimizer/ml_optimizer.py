import pandas as pd
import numpy as np
from itertools import permutations
from supabase import create_client
import os

supabase_url = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)
else:
    supabase = None

DIM_DIVISOR = 5000  # India standard (cm³/kg)
BASE_RATE_PER_KG = 50  # ₹ per kg — configurable

def load_boxes(user_id: str) -> list[dict]:
    """Load active boxes from catalog: global system boxes + user custom boxes"""
    if not supabase:
        return []
    
    try:
        if user_id:
            result = supabase.table("box_catalog").select("*").eq("is_active", True).or_(
                f"user_id.is.null,user_id.eq.{user_id}"
            ).order("volume_cm3", ascending=True).execute()
        else:
            result = supabase.table("box_catalog").select("*").eq("is_active", True).is_("user_id", "null").order("volume_cm3", ascending=True).execute()
        boxes = result.data
        # Pre-compute volume for sorting
        for b in boxes:
            b["volume_cm3"] = b.get("length", 0) * b.get("width", 0) * b.get("height", 0)
        boxes.sort(key=lambda x: x["volume_cm3"])
        return boxes
    except Exception as e:
        print("Error loading boxes from supabase:", e)
        return []

def try_fit_product_in_box(product: dict, box: dict, buffer_pct: float = 0.05) -> bool:
    """
    Try all 6 orientations of product to see if it fits in the box.
    Product dims are FIXED. We try rotating the product, not changing it.
    Buffer: box must be at least 5% larger than product in each dimension.
    """
    pl, pw, ph = product["length"], product["width"], product["height"]
    bl = box["length"] * (1 - buffer_pct)
    bw = box["width"] * (1 - buffer_pct)
    bh = box["height"] * (1 - buffer_pct)
    
    for (rl, rw, rh) in set(permutations([pl, pw, ph])):
        if rl <= bl and rw <= bw and rh <= bh:
            return True
    return False

def compute_fit_score(product: dict, box: dict) -> float:
    """Efficiency: how well the product fills the box (higher = less wasted space)"""
    product_vol = product["length"] * product["width"] * product["height"]
    box_vol = box["length"] * box["width"] * box["height"]
    if box_vol == 0:
        return 0.0
    return min(100.0, round((product_vol / box_vol) * 100, 1))

def compute_dim_weight(l: float, w: float, h: float) -> float:
    return (l * w * h) / DIM_DIVISOR

def compute_shipping_cost(actual_weight: float, l: float, w: float, h: float) -> float:
    dim_weight = compute_dim_weight(l, w, h)
    billable = max(actual_weight, dim_weight)
    return round(billable * BASE_RATE_PER_KG, 2)

def find_best_box(product: dict, boxes: list[dict]) -> dict | None:
    """
    First Fit Decreasing: find smallest box (sorted ascending by volume) that fits the product.
    Also check weight capacity of box.
    Returns the best matching box or None if no box fits.
    """
    product_weight = product.get("weight", 0)
    
    for box in boxes:  # already sorted smallest first
        # Check weight capacity
        if box.get("max_weight") and product_weight > box["max_weight"]:
            continue
        if try_fit_product_in_box(product, box):
            return box
    return None

def optimize_batch(products: list[dict], user_id: str, job_id: str) -> list[dict]:
    """
    Main optimization function.
    INPUT: list of products with their FIXED dimensions
    OUTPUT: for each product, the RECOMMENDED BOX from catalog
    """
    boxes = load_boxes(user_id)
    if not boxes:
        # fallback if catalog is empty or fails
        boxes = [
            {"id": "sys-1", "name": "Standard Small", "length": 20, "width": 15, "height": 10, "carrier": "Generic"},
            {"id": "sys-2", "name": "Standard Medium", "length": 30, "width": 25, "height": 15, "carrier": "Generic"},
            {"id": "sys-3", "name": "Standard Large", "length": 50, "width": 40, "height": 30, "carrier": "Generic"}
        ]
        for b in boxes:
            b["volume_cm3"] = b["length"] * b["width"] * b["height"]
    
    results = []
    for i, product in enumerate(products):
        try:
            prod_l = float(product.get("length") or product.get("length_cm") or product.get("Length") or product.get("l") or 0)
            prod_w = float(product.get("width") or product.get("width_cm") or product.get("Width") or product.get("w") or 0)
            prod_h = float(product.get("height") or product.get("height_cm") or product.get("Height") or product.get("h") or 0)
            prod_weight = float(product.get("weight") or product.get("weight_kg") or product.get("Weight") or product.get("wt") or 0)
            sku = str(product.get("sku") or product.get("product_id") or product.get("SKU") or product.get("id") or f"SKU-{i+1}")
            name = str(product.get("product_name") or product.get("name") or product.get("Name") or f"Product {i+1}")
        except (ValueError, TypeError):
            continue  # skip malformed rows
        
        if prod_l <= 0 or prod_w <= 0 or prod_h <= 0:
            continue  # skip zero-dimension products
        
        product_normalized = {"length": prod_l, "width": prod_w, "height": prod_h, "weight": prod_weight}
        
        best_box = find_best_box(product_normalized, boxes)
        
        if best_box is None:
            # No box fits — suggest largest available box and flag it
            best_box = boxes[-1] if boxes else None
            oversized = True
        else:
            oversized = False
        
        if best_box is None:
            continue
        
        # Original shipping cost (using product dims as if shipped in a default generic box)
        # Use product dims + 20% padding as the "old" box estimate
        old_l, old_w, old_h = prod_l * 1.2, prod_w * 1.2, prod_h * 1.2
        old_price = compute_shipping_cost(prod_weight, old_l, old_w, old_h)
        
        # New shipping cost using recommended box
        new_price = compute_shipping_cost(prod_weight, best_box["length"], best_box["width"], best_box["height"])
        
        savings = round(old_price - new_price, 2)
        fit_score = compute_fit_score(product_normalized, best_box)
        
        result = {
            "session_id": job_id,
            "user_id": user_id,
            "sku": sku,
            "product_name": name,
            "length_cm": prod_l,
            "width_cm": prod_w,
            "height_cm": prod_h,
            "weight_kg": prod_weight,
            "recommended_box_id": str(best_box.get("id", "")),
            "recommended_box_name": best_box["name"],
            "new_box_length_cm": best_box["length"],
            "new_box_width_cm": best_box["width"],
            "new_box_height_cm": best_box["height"],
            "recommended_carrier": best_box.get("carrier", "Generic"),
            "old_dim_weight": compute_dim_weight(old_l, old_w, old_h),
            "new_dim_weight": compute_dim_weight(best_box["length"], best_box["width"], best_box["height"]),
            "old_box_cost": old_price,
            "new_box_cost": new_price,
            "savings_amount": savings,
            "volume_utilization": fit_score,
            "oversized_flag": oversized,
        }
        results.append(result)
        
    return results
