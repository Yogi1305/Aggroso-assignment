from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import Claim, ClaimValidationResult, ReviewDecision, ClaimStatus, ReviewAction
from app.schemas.schemas import (
    ClaimCreate, ClaimBatchCreate, ClaimResponse, ClaimTotalsResponse,
    ValidationResultResponse, DecisionCreate, ReviewDecisionResponse
)
from app.services.deterministic_validator import DeterministicValidator
from app.services.ai_policy_engine import AIPolicyEngine

router = APIRouter(prefix="/claims", tags=["Claims"])

@router.post("", response_model=ClaimResponse)
def create_claim(claim_in: ClaimCreate, db: Session = Depends(get_db)):
    db_claim = Claim(
        claimant=claim_in.claimant.strip(),
        date=claim_in.date.strip(),
        category=claim_in.category.strip(),
        original_category=claim_in.category.strip(),
        amount=claim_in.amount,
        currency=claim_in.currency.strip().upper(),
        description=claim_in.description.strip(),
        receipt_available=claim_in.receipt_available,
        status=ClaimStatus.PENDING_REVIEW.value,
        is_evaluated=False
    )
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)
    return db_claim

@router.post("/batch", response_model=List[ClaimResponse])
def create_claim_batch(batch_in: ClaimBatchCreate, db: Session = Depends(get_db)):
    created_claims = []
    for claim_in in batch_in.claims:
        db_claim = Claim(
            claimant=claim_in.claimant.strip(),
            date=claim_in.date.strip(),
            category=claim_in.category.strip(),
            original_category=claim_in.category.strip(),
            amount=claim_in.amount,
            currency=claim_in.currency.strip().upper(),
            description=claim_in.description.strip(),
            receipt_available=claim_in.receipt_available,
            status=ClaimStatus.PENDING_REVIEW.value,
            is_evaluated=False
        )
        db.add(db_claim)
        created_claims.append(db_claim)
    
    db.commit()
    for c in created_claims:
        db.refresh(c)
    return created_claims

@router.get("", response_model=List[ClaimResponse])
def list_claims(
    status: Optional[str] = Query(None),
    claimant: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Claim)
    if status:
        query = query.filter(Claim.status == status.upper())
    if claimant:
        query = query.filter(Claim.claimant.ilike(f"%{claimant}%"))
    return query.order_by(Claim.id.desc()).all()

@router.get("/summary/totals", response_model=ClaimTotalsResponse)
def get_claim_totals(db: Session = Depends(get_db)):
    claims = db.query(Claim).all()
    return DeterministicValidator.calculate_totals(claims)

@router.get("/{claim_id}", response_model=ClaimResponse)
def get_claim(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim

@router.post("/{claim_id}/evaluate", response_model=ValidationResultResponse)
def evaluate_claim(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Step 1: Run Deterministic Validation
    validator = DeterministicValidator(db)
    det_results = validator.validate_claim(claim)

    # Step 2: Run AI Policy Evaluation Engine
    ai_engine = AIPolicyEngine(db)
    ai_results = ai_engine.evaluate_claim_policy(claim, det_results)

    # Upsert Validation Result
    val_result = db.query(ClaimValidationResult).filter(ClaimValidationResult.claim_id == claim_id).first()
    if not val_result:
        val_result = ClaimValidationResult(claim_id=claim_id)
        db.add(val_result)

    val_result.is_duplicate = det_results["is_duplicate"]
    val_result.duplicate_of_claim_ids = det_results["duplicate_of_claim_ids"]
    val_result.missing_receipt = det_results["missing_receipt"]
    val_result.exceeds_category_limit = det_results["exceeds_category_limit"]
    val_result.category_limit_amount = det_results["category_limit_amount"]
    val_result.invalid_fields = det_results["invalid_fields"]

    val_result.ai_suggested_category = ai_results["ai_suggested_category"]
    val_result.is_uncertain = ai_results["is_uncertain"]
    val_result.confidence_score = ai_results["confidence_score"]
    val_result.compliance_status = ai_results["compliance_status"]
    val_result.explanation = ai_results["explanation"]
    val_result.policy_citation = ai_results["policy_citation"]
    val_result.missing_info_request = ai_results["missing_info_request"]

    claim.is_evaluated = True

    db.commit()
    db.refresh(val_result)
    return val_result

@router.post("/{claim_id}/decision", response_model=ReviewDecisionResponse)
def record_decision(claim_id: int, decision_in: DecisionCreate, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    action = decision_in.action.upper()
    if action not in [a.value for a in ReviewAction]:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of {[a.value for a in ReviewAction]}")

    previous_category = claim.category
    new_category = None

    if action == ReviewAction.OVERRIDE_CLASSIFICATION.value:
        if not decision_in.reason or not decision_in.reason.strip():
            raise HTTPException(status_code=400, detail="Reason is required when overriding AI classification")
        if not decision_in.new_category or not decision_in.new_category.strip():
            raise HTTPException(status_code=400, detail="New category is required when overriding classification")
        
        new_category = decision_in.new_category.strip()
        claim.category = new_category

    elif action == ReviewAction.APPROVE.value:
        claim.status = ClaimStatus.APPROVED.value
    elif action == ReviewAction.REJECT.value:
        claim.status = ClaimStatus.REJECTED.value
    elif action == ReviewAction.REQUEST_CLARIFICATION.value:
        claim.status = ClaimStatus.CLARIFICATION_REQUESTED.value

    decision = ReviewDecision(
        claim_id=claim_id,
        action=action,
        reviewer=decision_in.reviewer,
        reason=decision_in.reason,
        previous_category=previous_category,
        new_category=new_category
    )

    db.add(decision)
    db.commit()
    db.refresh(decision)
    return decision

@router.get("/{claim_id}/history", response_model=List[ReviewDecisionResponse])
def get_claim_history(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim.review_history
