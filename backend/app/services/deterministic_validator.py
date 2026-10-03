from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import Claim, PolicyRule

class DeterministicValidator:
    def __init__(self, db: Session):
        self.db = db

    def validate_claim(self, claim: Claim) -> Dict[str, Any]:
        """
        Executes deterministic rules on an individual claim:
        - Required field & date validation
        - Missing receipt detection
        - Category limit checking
        - Duplicate detection across existing claims
        """
        invalid_fields = self._check_required_fields(claim)
        is_duplicate, duplicate_ids = self._check_duplicates(claim)
        missing_receipt = self._check_missing_receipt(claim)
        exceeds_limit, limit_amount = self._check_category_limit(claim)

        return {
            "invalid_fields": invalid_fields,
            "is_duplicate": is_duplicate,
            "duplicate_of_claim_ids": duplicate_ids,
            "missing_receipt": missing_receipt,
            "exceeds_category_limit": exceeds_limit,
            "category_limit_amount": limit_amount
        }

    def _check_required_fields(self, claim: Claim) -> List[str]:
        invalid = []
        if not claim.claimant or not claim.claimant.strip():
            invalid.append("claimant")
        if not claim.date or not claim.date.strip():
            invalid.append("date")
        else:
            try:
                datetime.strptime(claim.date.strip(), "%Y-%m-%d")
            except ValueError:
                invalid.append("date_format_invalid")
        if claim.amount is None or claim.amount <= 0:
            invalid.append("amount")
        if not claim.currency or not claim.currency.strip():
            invalid.append("currency")
        if not claim.description or not claim.description.strip():
            invalid.append("description")
        return invalid

    def _check_duplicates(self, claim: Claim) -> Tuple[bool, List[int]]:
        """
        Detects duplicate claims matching:
        - Same claimant
        - Same amount
        - Same currency
        - Same date (or identical description)
        """
        existing_claims = self.db.query(Claim).filter(
            Claim.id != claim.id,
            Claim.claimant == claim.claimant,
            Claim.amount == claim.amount,
            Claim.currency == claim.currency
        ).all()

        duplicate_ids = []
        for c in existing_claims:
            if c.date == claim.date or (c.description and c.description.strip().lower() == claim.description.strip().lower()):
                duplicate_ids.append(c.id)

        return len(duplicate_ids) > 0, duplicate_ids

    def _check_missing_receipt(self, claim: Claim) -> bool:
        """
        Receipt is required if receipt_available is False AND:
        - Policy rule specifies receipt_required=True and amount > receipt_threshold
        """
        if claim.receipt_available:
            return False

        policy = self.db.query(PolicyRule).filter(
            PolicyRule.category.ilike(claim.category.strip())
        ).first()

        if policy:
            if policy.receipt_required and claim.amount > policy.receipt_threshold:
                return True
        else:
            # Default threshold if no policy explicitly configured
            if claim.amount > 25.00:
                return True

        return False

    def _check_category_limit(self, claim: Claim) -> Tuple[bool, float | None]:
        policy = self.db.query(PolicyRule).filter(
            PolicyRule.category.ilike(claim.category.strip())
        ).first()

        if policy and policy.max_amount is not None:
            if claim.amount > policy.max_amount:
                return True, policy.max_amount

        return False, None

    @staticmethod
    def calculate_totals(claims: List[Claim]) -> Dict[str, Any]:
        """
        Calculates totals and aggregates for a batch of claims
        """
        total_claims = len(claims)
        status_counts = {}
        currency_totals = {}
        category_breakdown = {}

        for c in claims:
            status_counts[c.status] = status_counts.get(c.status, 0) + 1
            
            # Totals per currency
            currency_totals[c.currency] = currency_totals.get(c.currency, 0.0) + c.amount
            
            # Category breakdown
            cat_data = category_breakdown.get(c.category, {"count": 0, "total_amount": 0.0})
            cat_data["count"] += 1
            cat_data["total_amount"] += c.amount
            category_breakdown[c.category] = cat_data

        return {
            "total_claims_count": total_claims,
            "claims_by_status": status_counts,
            "total_amount_by_currency": currency_totals,
            "category_breakdown": category_breakdown
        }
