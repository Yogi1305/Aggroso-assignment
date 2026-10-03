from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import PolicyRule
from app.schemas.schemas import PolicyRuleCreate, PolicyRuleResponse

router = APIRouter(prefix="/policies", tags=["Policies"])

@router.get("", response_model=List[PolicyRuleResponse])
def get_policies(db: Session = Depends(get_db)):
    return db.query(PolicyRule).all()

@router.post("", response_model=PolicyRuleResponse)
def create_policy(policy_in: PolicyRuleCreate, db: Session = Depends(get_db)):
    existing = db.query(PolicyRule).filter(PolicyRule.category.ilike(policy_in.category.strip())).first()
    if existing:
        # Update existing policy
        existing.max_amount = policy_in.max_amount
        existing.currency = policy_in.currency.upper()
        existing.receipt_required = policy_in.receipt_required
        existing.receipt_threshold = policy_in.receipt_threshold
        existing.description_pattern = policy_in.description_pattern
        existing.policy_citation = policy_in.policy_citation
        existing.policy_details = policy_in.policy_details
        db.commit()
        db.refresh(existing)
        return existing

    db_policy = PolicyRule(
        category=policy_in.category.strip(),
        max_amount=policy_in.max_amount,
        currency=policy_in.currency.upper(),
        receipt_required=policy_in.receipt_required,
        receipt_threshold=policy_in.receipt_threshold,
        description_pattern=policy_in.description_pattern,
        policy_citation=policy_in.policy_citation,
        policy_details=policy_in.policy_details
    )
    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy
