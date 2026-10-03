from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# User Schemas
class UserCreate(BaseModel):
    name: str
    email: str
    contact: Optional[str] = None
    role: str = "user"
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    contact: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str


# Policy Schemas
class PolicyRuleBase(BaseModel):
    category: str
    max_amount: Optional[float] = None
    currency: str = "USD"
    receipt_required: bool = True
    receipt_threshold: float = 0.0
    description_pattern: Optional[str] = None
    policy_citation: str
    policy_details: str

class PolicyRuleCreate(PolicyRuleBase):
    pass

class PolicyRuleResponse(PolicyRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Claim Schemas
class ClaimCreate(BaseModel):
    claimant: str = Field(..., example="Alice Smith")
    date: str = Field(..., example="2026-10-01")
    category: str = Field(..., example="Meals")
    amount: float = Field(..., example=45.50)
    currency: str = Field(default="USD", example="USD")
    description: str = Field(..., example="Dinner with client during regional sales trip")
    receipt_available: bool = Field(default=True)

class ClaimBatchCreate(BaseModel):
    claims: List[ClaimCreate]

# Validation & AI evaluation output schemas
class ValidationResultResponse(BaseModel):
    id: int
    claim_id: int
    is_duplicate: bool
    duplicate_of_claim_ids: List[int]
    missing_receipt: bool
    exceeds_category_limit: bool
    category_limit_amount: Optional[float]
    invalid_fields: List[str]
    
    ai_suggested_category: Optional[str]
    is_uncertain: bool
    confidence_score: float
    compliance_status: str # COMPLIANT, REQUIRES_REVIEW, NEEDS_CLARIFICATION, NON_COMPLIANT
    explanation: str
    policy_citation: Optional[str]
    missing_info_request: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Decision & History Schemas
class DecisionCreate(BaseModel):
    action: str = Field(..., example="APPROVE") # APPROVE, REJECT, REQUEST_CLARIFICATION, OVERRIDE_CLASSIFICATION
    reviewer: str = Field(default="Manager Reviewer")
    reason: Optional[str] = Field(default=None, example="Category updated based on taxi receipt description")
    new_category: Optional[str] = Field(default=None, example="Travel")

class ReviewDecisionResponse(BaseModel):
    id: int
    claim_id: int
    action: str
    reviewer: str
    reason: Optional[str]
    previous_category: Optional[str]
    new_category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Complete Claim Response schema
class ClaimResponse(BaseModel):
    id: int
    claimant: str
    date: str
    category: str
    original_category: Optional[str]
    amount: float
    currency: str
    description: str
    receipt_available: bool
    status: str
    is_evaluated: bool
    created_at: datetime
    validation_results: Optional[ValidationResultResponse] = None
    review_history: List[ReviewDecisionResponse] = []

    class Config:
        from_attributes = True

# Batch Aggregation Schema
class ClaimTotalsResponse(BaseModel):
    total_claims_count: int
    claims_by_status: dict
    total_amount_by_currency: dict
    category_breakdown: dict
