from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.models import Claim, PolicyRule

class AIPolicyEngine:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_claim_policy(self, claim: Claim, deterministic_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI Reasoning Engine:
        1. Classifies ambiguous claim descriptions into policy categories.
        2. Retrieves the relevant policy section and evidence citations.
        3. Explains compliance / non-compliance / review need.
        4. Detects missing info and formats clarification prompts.
        5. Marks low-confidence/uncertain classifications.
        """
        all_policies = self.db.query(PolicyRule).all()

        # Step 1: Category classification & match
        suggested_category, confidence, is_uncertain = self._classify_category(
            claim.category, claim.description, all_policies
        )

        matched_policy = self._find_policy_for_category(suggested_category or claim.category, all_policies)

        # Step 2: Policy Evidence Retrieval & Citations
        policy_citation = matched_policy.policy_citation if matched_policy else "Sec 9.0 - General Expense Policy"
        policy_details = matched_policy.policy_details if matched_policy else "Standard operational reimbursement terms apply."

        # Step 3: Determine compliance status & explanation
        compliance_status, explanation, missing_info = self._determine_compliance(
            claim=claim,
            deterministic_results=deterministic_results,
            matched_policy=matched_policy,
            suggested_category=suggested_category,
            is_uncertain=is_uncertain,
            policy_citation=policy_citation,
            policy_details=policy_details
        )

        return {
            "ai_suggested_category": suggested_category,
            "confidence_score": confidence,
            "is_uncertain": is_uncertain,
            "compliance_status": compliance_status,
            "explanation": explanation,
            "policy_citation": policy_citation,
            "missing_info_request": missing_info
        }

    def _classify_category(self, user_category: str, description: str, policies: List[PolicyRule]):
        desc_lower = (description or "").lower()
        user_cat_lower = (user_category or "").lower()

        best_match = None
        highest_score = 0
        
        # Check against existing policy keyword patterns
        for policy in policies:
            keywords = []
            if policy.description_pattern:
                keywords = [k.strip().lower() for k in policy.description_pattern.split(",") if k.strip()]
            keywords.append(policy.category.lower())

            matches = sum(1 for kw in keywords if kw in desc_lower or kw in user_cat_lower)
            if matches > highest_score:
                highest_score = matches
                best_match = policy.category

        if user_cat_lower in ["unclassified", "other", "general", "unknown", "misc", "miscellaneous", ""]:
            if best_match:
                return best_match, 0.85, False
            else:
                return "General Expense", 0.40, True # Marked as uncertain

        # Check if description contradicts provided user category
        if best_match and best_match.lower() != user_cat_lower:
            # Ambiguous/conflicting classification
            return best_match, 0.60, True

        return user_category, 0.95 if not is_uncertain_desc(desc_lower) else 0.50, is_uncertain_desc(desc_lower)

    def _find_policy_for_category(self, category_name: str, policies: List[PolicyRule]) -> Optional[PolicyRule]:
        for p in policies:
            if p.category.lower() == category_name.lower():
                return p
        return None

    def _determine_compliance(
        self,
        claim: Claim,
        deterministic_results: Dict[str, Any],
        matched_policy: Optional[PolicyRule],
        suggested_category: str,
        is_uncertain: bool,
        policy_citation: str,
        policy_details: str
    ):
        reasons = []
        missing_info = None

        # Check field invalidity
        if deterministic_results.get("invalid_fields"):
            invalid = ", ".join(deterministic_results["invalid_fields"])
            reasons.append(f"Invalid or missing claim fields: {invalid}.")
            missing_info = f"Please provide valid values for: {invalid}."
            return "NEEDS_CLARIFICATION", " ".join(reasons), missing_info

        # Check duplicates
        if deterministic_results.get("is_duplicate"):
            dup_ids = ", ".join(str(i) for i in deterministic_results.get("duplicate_of_claim_ids", []))
            reasons.append(f"Potential duplicate claim detected (matching Claim ID(s): #{dup_ids}). Policy evidence [{policy_citation}]: Duplicate submissions for identical expenses are prohibited.")
            return "REQUIRES_REVIEW", " ".join(reasons), missing_info

        # Check missing receipt
        if deterministic_results.get("missing_receipt"):
            reasons.append(f"Receipt is required for {claim.category} claims exceeding threshold under policy [{policy_citation}].")
            missing_info = f"Please upload an itemized receipt for your {claim.currency} {claim.amount:.2f} {claim.category} expense."
            return "NEEDS_CLARIFICATION", " ".join(reasons), missing_info

        # Check category limit breach
        if deterministic_results.get("exceeds_category_limit"):
            limit = deterministic_results.get("category_limit_amount")
            reasons.append(f"Claim amount ({claim.currency} {claim.amount:.2f}) exceeds configured {claim.category} limit ({claim.currency} {limit:.2f}). Policy evidence [{policy_citation}]: {policy_details}")
            return "NON_COMPLIANT", " ".join(reasons), missing_info

        # Check uncertain classification
        if is_uncertain:
            reasons.append(f"AI classification for claim description ('{claim.description}') is uncertain or ambiguous. Suggested category: '{suggested_category}'. Human review required per policy [{policy_citation}].")
            return "REQUIRES_REVIEW", " ".join(reasons), missing_info

        # Fully compliant case
        reasons.append(f"Claim fully complies with policy guidelines. Cited section [{policy_citation}]: {policy_details}")
        return "COMPLIANT", " ".join(reasons), None

def is_uncertain_desc(desc: str) -> bool:
    vague_words = ["stuff", "misc", "something", "personal", "n/a", "expense", "other", "etc"]
    return any(w == desc.strip() for w in vague_words) or len(desc.strip()) < 4
