from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoxSpec(BaseModel):
    id: str
    name: str
    sku: Optional[str] = None
    length_cm: float
    width_cm: float
    height_cm: float
    max_weight_kg: Optional[float] = None
    cost_usd: float = 0.0
    material: Optional[str] = "Corrugated"
    eco_certified: bool = False
    double_wall: bool = False

class OptimizationInput(BaseModel):
    product_name: str
    product_id: str
    length_cm: float
    width_cm: float
    height_cm: float
    weight_kg: float
    fragility: str = Field(default="low", pattern="^(low|medium|high|extreme)$")
    quantity: int = 1
    category: str = "general"
    destination_zone: int = Field(default=2, ge=1, le=6)
    shipping_method: str = Field(default="standard", pattern="^(standard|express|overnight)$")
    available_boxes: List[BoxSpec]
    
    # Optional baseline comparisons
    current_box_name: Optional[str] = None
    current_box_length: Optional[float] = None
    current_box_width: Optional[float] = None
    current_box_height: Optional[float] = None
    current_box_cost_usd: Optional[float] = None

class ScoreBreakdown(BaseModel):
    empty_space_penalty: float
    shipping_cost_penalty: float
    damage_risk_penalty: float
    material_cost_penalty: float
    total_score: float

class AlternativeBox(BaseModel):
    box_name: str
    box_sku: Optional[str] = None
    box_dims: str
    score: float
    total_cost: float
    reasoning: Optional[str] = None

class OptimizationResponse(BaseModel):
    recommended_box_name: str
    recommended_box_dims: str  # e.g., "10x10x10"
    recommended_box_sku: Optional[str] = None
    packaging_cost: float
    shipping_cost: float
    total_cost: float
    baseline_cost: float
    savings: float
    savings_percent: float
    damage_risk: str
    space_utilization: float
    confidence_score: float
    reasoning: str
    dim_weight_reduction: float
    volume_saved_cm3: float
    sustainability_score: float
    
    # New Fields
    sku: Optional[str] = None
    product_name: Optional[str] = None
    top_alternatives: List[AlternativeBox] = []
    score_breakdown: Optional[ScoreBreakdown] = None
    engine_version: str = "ML-Scorer v1.0"
    fit_check_passed: bool = True
    clearance_used: float = 0.0
