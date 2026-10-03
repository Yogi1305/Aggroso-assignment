import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class ClaimStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLARIFICATION_REQUESTED = "CLARIFICATION_REQUESTED"

class ReviewAction(str, enum.Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_CLARIFICATION = "REQUEST_CLARIFICATION"
    OVERRIDE_CLASSIFICATION = "OVERRIDE_CLASSIFICATION"

class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True, nullable=False) # e.g., Meals, Travel, Software, Office Supplies
    max_amount = Column(Float, nullable=True) # None if unlimited
    currency = Column(String, default="USD")
    receipt_required = Column(Boolean, default=True)
    receipt_threshold = Column(Float, default=0.0) # Receipt required if amount > threshold
    description_pattern = Column(String, nullable=True) # Keyword hints for AI matching
    policy_citation = Column(String, nullable=False) # Section reference e.g., "Sec 3.2 - Travel & Meals"
    policy_details = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    claimant = Column(String, index=True, nullable=False)
    date = Column(String, nullable=False) # ISO format YYYY-MM-DD
    category = Column(String, nullable=False) # Provided category or unclassified
    original_category = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    description = Column(Text, nullable=False)
    receipt_available = Column(Boolean, default=False, nullable=False) # True for 'yes', False for 'no'
    
    status = Column(String, default=ClaimStatus.PENDING_REVIEW.value)
    
    # AI and Validation output caches
    is_evaluated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    validation_results = relationship("ClaimValidationResult", back_populates="claim", uselist=False, cascade="all, delete-orphan")
    review_history = relationship("ReviewDecision", back_populates="claim", cascade="all, delete-orphan", order_by="ReviewDecision.created_at.desc()")

class ClaimValidationResult(Base):
    __tablename__ = "claim_validation_results"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=False, unique=True)
    
    # Deterministic checks
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_claim_ids = Column(JSON, default=list) # List of duplicate claim IDs
    missing_receipt = Column(Boolean, default=False)
    exceeds_category_limit = Column(Boolean, default=False)
    category_limit_amount = Column(Float, nullable=True)
    invalid_fields = Column(JSON, default=list)
    
    # AI Engine findings
    ai_suggested_category = Column(String, nullable=True)
    is_uncertain = Column(Boolean, default=False)
    confidence_score = Column(Float, default=1.0)
    compliance_status = Column(String, nullable=False) # COMPLIANT, REQUIRES_REVIEW, NEEDS_CLARIFICATION, NON_COMPLIANT
    explanation = Column(Text, nullable=False)
    policy_citation = Column(String, nullable=True)
    missing_info_request = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="validation_results")

class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=False)
    action = Column(String, nullable=False) # APPROVE, REJECT, REQUEST_CLARIFICATION, OVERRIDE_CLASSIFICATION
    reviewer = Column(String, default="System Reviewer")
    reason = Column(Text, nullable=True) # Required for OVERRIDE_CLASSIFICATION
    previous_category = Column(String, nullable=True)
    new_category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="review_history")
