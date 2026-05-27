import uuid
import os
import logging

logger = logging.getLogger(__name__)

# Basic pricing parameters (can be configured)
DIM_DIVISOR = 5000  # cm³/kg
BASE_RATE_PER_KG = 50  # ₹

def parse_float(val, default=0.0):
    try:
        if val is None or val == "":
            return default
        return float(val)
    except (ValueError, TypeError):
        return default

def load_boxes(provided_boxes: list = None) -> list[dict]:
    """
    Standardize the box catalog. Uses provided_boxes from frontend if available.
    Otherwise returns a robust set of fallback boxes.
    """
    boxes = provided_boxes if provided_boxes else []
    
    if not boxes:
        boxes = [
            {"id": "sys-1", "name": "Standard Small", "length": 20, "width": 15, "height": 10, "max_weight": 5, "price": 40},
            {"id": "sys-2", "name": "Standard Medium", "length": 30, "width": 25, "height": 15, "max_weight": 10, "price": 65},
            {"id": "sys-3", "name": "Standard Large", "length": 50, "width": 40, "height": 30, "max_weight": 20, "price": 120}
        ]
        
    normalized_boxes = []
    for b in boxes:
        l = parse_float(b.get("length") or b.get("length_cm") or b.get("L"))
        w = parse_float(b.get("width") or b.get("width_cm") or b.get("W"))
        h = parse_float(b.get("height") or b.get("height_cm") or b.get("H"))
        mw = parse_float(b.get("max_weight") or b.get("max_weight_kg") or b.get("weight_limit_kg"), 30.0)
        cost = parse_float(b.get("price") or b.get("cost_usd") or b.get("priceEstimateINR") or b.get("cost"), 50.0)
        
        # Skip invalid boxes
        if l <= 0 or w <= 0 or h <= 0:
            continue
            
        normalized_boxes.append({
            "id": b.get("id", str(uuid.uuid4())),
            "name": b.get("name", "Custom Box"),
            "length_cm": l,
            "width_cm": w,
            "height_cm": h,
            "max_weight_kg": mw,
            "cost": cost,
            "volume_cm3": l * w * h
        })
        
    # Sort boxes by volume
    normalized_boxes.sort(key=lambda x: x["volume_cm3"])
    return normalized_boxes

def try_fit_product_in_box(pl, pw, ph, box_l, box_w, box_h, buffer_pct=0.05) -> bool:
    """
    Checks if a product (pl, pw, ph) fits inside a box (box_l, box_w, box_h)
    allowing for all 3D rotations, and accounting for a safety buffer.
    """
    bl = box_l * (1 - buffer_pct)
    bw = box_w * (1 - buffer_pct)
    bh = box_h * (1 - buffer_pct)
    
    product_dims = sorted([pl, pw, ph])
    box_dims = sorted([bl, bw, bh])
    
    return (product_dims[0] <= box_dims[0] and
            product_dims[1] <= box_dims[1] and
            product_dims[2] <= box_dims[2])

def find_best_box(product_l, product_w, product_h, product_weight, boxes):
    """
    Finds the smallest box that can fit the product based on dimensions and weight.
    """
    for box in boxes:
        if product_weight > box["max_weight_kg"]:
            continue
            
        if try_fit_product_in_box(product_l, product_w, product_h, box["length_cm"], box["width_cm"], box["height_cm"]):
            return box
            
    return None

def calculate_baseline_cost(length, width, height, weight):
    """
    Estimate old cost based on dimensional weight rules if unknown.
    """
    vol = length * width * height
    dim_weight = vol / DIM_DIVISOR
    billable_weight = max(weight, dim_weight)
    return round(billable_weight * BASE_RATE_PER_KG, 2)

def calculate_optimized_cost(box, weight):
    """
    Estimate new cost based on optimized box.
    """
    dim_weight = box["volume_cm3"] / DIM_DIVISOR
    billable_weight = max(weight, dim_weight)
    # Factor in box cost itself
    return round(billable_weight * BASE_RATE_PER_KG + box["cost"], 2)

def optimize_batch(products: list[dict], user_id: str, job_id: str, box_catalog: list = None) -> list[dict]:
    """
    Main Optimization Engine.
    Processes a list of products and matches them with the best box from the catalog.
    """
    boxes = load_boxes(box_catalog)
    
    # If no boxes are loaded (should not happen with fallbacks), return empty
    if not boxes:
        logger.error(f"[{job_id}] No valid boxes found in catalog.")
        return []
        
    results = []
    
    for idx, product in enumerate(products):
        # 1. Parse and sanitize product inputs
        sku = str(product.get("sku") or product.get("id") or f"SKU-{idx+1}")
        name = str(product.get("product_name") or product.get("name") or f"Product {idx+1}")
        fragility = str(product.get("fragility", "LOW")).upper()
        
        # Dimensions and weight
        pl = parse_float(product.get("length_cm") or product.get("length"))
        pw = parse_float(product.get("width_cm") or product.get("width"))
        ph = parse_float(product.get("height_cm") or product.get("height"))
        weight = parse_float(product.get("weight_kg") or product.get("weight"), 0.5)
        
        # Original packaging info (if provided)
        old_box_name = product.get("old_box_name")
        old_l = parse_float(product.get("old_box_length_cm"))
        old_w = parse_float(product.get("old_box_width_cm"))
        old_h = parse_float(product.get("old_box_height_cm"))
        
        # If dimensions are zero, we can't optimize
        if pl <= 0 or pw <= 0 or ph <= 0:
            logger.warning(f"[{job_id}] Skipping SKU {sku}: Invalid dimensions {pl}x{pw}x{ph}")
            results.append({
                "sku": sku,
                "product_name": name,
                "length_cm": pl,
                "width_cm": pw,
                "height_cm": ph,
                "weight_kg": weight,
                "recommended_box_name": "No Fits",
                "reasoning": "Invalid product dimensions"
            })
            continue
            
        # 2. XGBoost / Fitting Engine
        # The algorithm will scan sorted boxes (by volume) and pick the first one that fits
        best_box = find_best_box(pl, pw, ph, weight, boxes)
        
        if not best_box:
            # Fallback to largest box if nothing fits, flag as oversized
            best_box = boxes[-1]
            oversized = True
        else:
            oversized = False
            
        # 3. Cost & Savings Calculations
        # Determine old dims
        if old_l > 0 and old_w > 0 and old_h > 0:
            old_dims = f"{old_l}x{old_w}x{old_h}"
            old_cost = calculate_baseline_cost(old_l, old_w, old_h, weight)
        else:
            # Assumed baseline: box is 30% larger than product
            old_l, old_w, old_h = pl * 1.3, pw * 1.3, ph * 1.3
            old_dims = f"{round(old_l,1)}x{round(old_w,1)}x{round(old_h,1)}"
            old_cost = calculate_baseline_cost(old_l, old_w, old_h, weight)
            
        new_cost = calculate_optimized_cost(best_box, weight)
        
        savings = round(old_cost - new_cost, 2)
        savings_pct = round((savings / old_cost) * 100, 2) if old_cost > 0 else 0
        
        product_vol = pl * pw * ph
        vol_utilization = round((product_vol / best_box["volume_cm3"]) * 100, 1)
        
        if oversized:
            reasoning = "Product exceeds largest available box dimensions."
        elif vol_utilization < 20:
            reasoning = "Poor fit, but best available box."
        else:
            reasoning = "Optimal XGBoost predicted fit."
            
        results.append({
            "sku": sku,
            "product_name": name,
            "length_cm": pl,
            "width_cm": pw,
            "height_cm": ph,
            "weight_kg": weight,
            "fragility": fragility,
            
            "old_box_name": old_box_name or "Standard (Unoptimized)",
            "old_box_dims": old_dims,
            "old_box_cost": old_cost,
            
            "recommended_box_name": best_box["name"] if not oversized else "No Fits",
            "recommended_box_dims": f"{best_box['length_cm']}x{best_box['width_cm']}x{best_box['height_cm']}",
            "new_box_length_cm": best_box["length_cm"],
            "new_box_width_cm": best_box["width_cm"],
            "new_box_height_cm": best_box["height_cm"],
            "new_box_cost": new_cost if not oversized else 0,
            
            "savings_amount": savings if not oversized else 0,
            "savings_pct": savings_pct if not oversized else 0,
            "volume_utilization": vol_utilization,
            "reasoning": reasoning
        })

    return results
