import json
import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from loguru import logger
from app.models.models import Claim, PolicyRule
from app.config import settings

# ─── LLM Client Setup ────────────────────────────────────────────────
_llm_client = None

def _get_llm_client():
    """Lazy-initialize OpenAI-compatible client for Groq."""
    global _llm_client
    if _llm_client is not None:
        return _llm_client

    api_key = settings.GROQ_API_KEY or settings.OPENAI_API_KEY
    if not api_key:
        logger.warning("[AI] No GROQ_API_KEY or OPENAI_API_KEY configured — LLM calls disabled, using keyword fallback")
        return None

    try:
        from openai import OpenAI
        _llm_client = OpenAI(
            api_key=api_key,
            base_url=settings.OPENAI_BASE_URL,
        )
        logger.info(f"[AI] LLM client initialized | base_url={settings.OPENAI_BASE_URL} | model={settings.LLM_MODEL}")
        return _llm_client
    except Exception as e:
        logger.error(f"[AI] Failed to initialize LLM client: {e}")
        return None


# ─── AI Policy Engine ─────────────────────────────────────────────────
class AIPolicyEngine:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_claim_policy(self, claim: Claim, deterministic_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hybrid AI Reasoning Engine:
        1. Runs keyword-based pre-classification (fast, deterministic).
        2. Calls Groq LLM for natural-language compliance reasoning.
        3. Falls back to keyword logic if LLM is unavailable or errors.
        """
        logger.info(f"[AI] ═══ Starting evaluation for Claim #{claim.id} | claimant={claim.claimant} | category={claim.category} | amount={claim.currency} {claim.amount}")

        all_policies = self.db.query(PolicyRule).all()

        # Step 1: Keyword-based pre-classification (always runs — serves as fallback)
        suggested_category, confidence, is_uncertain = self._classify_category(
            claim.category, claim.description, all_policies
        )
        logger.info(f"[AI] Keyword pre-classification: suggested={suggested_category} | confidence={confidence:.2f} | uncertain={is_uncertain}")

        matched_policy = self._find_policy_for_category(suggested_category or claim.category, all_policies)

        policy_citation = matched_policy.policy_citation if matched_policy else "Sec 9.0 - General Expense Policy"
        policy_details = matched_policy.policy_details if matched_policy else "Standard operational reimbursement terms apply."

        # Step 2: Build keyword-based (fallback) result
        fallback_status, fallback_explanation, fallback_missing = self._determine_compliance(
            claim=claim,
            deterministic_results=deterministic_results,
            matched_policy=matched_policy,
            suggested_category=suggested_category,
            is_uncertain=is_uncertain,
            policy_citation=policy_citation,
            policy_details=policy_details
        )
        logger.info(f"[AI] Keyword fallback result: status={fallback_status}")

        # Step 3: Attempt LLM-powered evaluation
        llm_result = self._call_llm(claim, deterministic_results, all_policies, suggested_category, confidence)

        if llm_result:
            logger.info(f"[AI] ✓ Using LLM result | status={llm_result['compliance_status']} | llm_category={llm_result['ai_suggested_category']}")
            # Merge LLM result with keyword pre-classification data
            return {
                "ai_suggested_category": llm_result.get("ai_suggested_category", suggested_category),
                "confidence_score": llm_result.get("confidence_score", confidence),
                "is_uncertain": llm_result.get("is_uncertain", is_uncertain),
                "compliance_status": llm_result.get("compliance_status", fallback_status),
                "explanation": llm_result.get("explanation", fallback_explanation),
                "policy_citation": llm_result.get("policy_citation", policy_citation),
                "missing_info_request": llm_result.get("missing_info_request", fallback_missing)
            }
        else:
            logger.warning(f"[AI] ✗ LLM unavailable — returning keyword fallback result")
            return {
                "ai_suggested_category": suggested_category,
                "confidence_score": confidence,
                "is_uncertain": is_uncertain,
                "compliance_status": fallback_status,
                "explanation": fallback_explanation,
                "policy_citation": policy_citation,
                "missing_info_request": fallback_missing
            }

    def _call_llm(self, claim: Claim, det_results: Dict, policies: List[PolicyRule], keyword_category: str, keyword_confidence: float) -> Optional[Dict]:
        """Call Groq LLM for AI-powered compliance reasoning. Returns None on failure."""
        client = _get_llm_client()
        if not client:
            return None

        # Build policy context
        policy_context = "\n".join([
            f"- Category: {p.category} | Max: {p.currency} {p.max_amount} | Receipt required above {p.currency} {p.receipt_threshold} | Citation: {p.policy_citation} | Details: {p.policy_details}"
            for p in policies
        ])

        # Build deterministic findings summary
        det_findings = []
        if det_results.get("is_duplicate"):
            det_findings.append(f"DUPLICATE detected (matches claim IDs: {det_results.get('duplicate_of_claim_ids', [])})")
        if det_results.get("missing_receipt"):
            det_findings.append("MISSING RECEIPT (required by policy)")
        if det_results.get("exceeds_category_limit"):
            det_findings.append(f"EXCEEDS LIMIT (category limit: {det_results.get('category_limit_amount')})")
        if det_results.get("invalid_fields"):
            det_findings.append(f"INVALID FIELDS: {det_results['invalid_fields']}")
        if not det_findings:
            det_findings.append("All deterministic checks passed.")

        system_prompt = """You are an AI expense policy compliance auditor for an organization. You review employee expense claims against the company's expense policy rules.

Your job is to:
1. Classify the claim into the most appropriate policy category based on its description.
2. Determine if the claim complies with policy, needs review, needs clarification, or is non-compliant.
3. Provide a clear, professional explanation citing the relevant policy section.
4. If information is missing, write a clear request for the employee.

You MUST respond with valid JSON only (no markdown, no code fences). Use this exact schema:
{
  "ai_suggested_category": "string - the best matching policy category",
  "confidence_score": 0.0-1.0,
  "is_uncertain": true/false,
  "compliance_status": "COMPLIANT|REQUIRES_REVIEW|NEEDS_CLARIFICATION|NON_COMPLIANT",
  "explanation": "string - detailed compliance reasoning with policy citations",
  "policy_citation": "string - the relevant policy section reference",
  "missing_info_request": "string or null - what info the employee needs to provide, null if nothing missing"
}"""

        user_prompt = f"""Review this expense claim against our policy:

CLAIM DETAILS:
- Claimant: {claim.claimant}
- Date: {claim.date}
- Category (submitted): {claim.category}
- Amount: {claim.currency} {claim.amount:.2f}
- Description: {claim.description}
- Receipt available: {'Yes' if claim.receipt_available else 'No'}

KEYWORD PRE-CLASSIFICATION:
- Suggested category: {keyword_category} (confidence: {keyword_confidence:.2f})

DETERMINISTIC VALIDATION FINDINGS:
{chr(10).join('- ' + f for f in det_findings)}

ORGANIZATION EXPENSE POLICY RULES:
{policy_context}

Analyze this claim and respond with the JSON verdict."""

        try:
            logger.info(f"[AI] Sending LLM request to Groq | model={settings.LLM_MODEL} | claim_id={claim.id}")
            start_time = time.time()

            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=600,
                timeout=15
            )

            duration_ms = round((time.time() - start_time) * 1000, 2)
            raw_content = response.choices[0].message.content.strip()
            logger.info(f"[AI] LLM response received in {duration_ms}ms | tokens={response.usage.total_tokens if response.usage else 'N/A'}")
            logger.debug(f"[AI] LLM raw response: {raw_content[:300]}")

            # Parse JSON — handle markdown code fences if present
            json_str = raw_content
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1] if "\n" in json_str else json_str[3:]
                json_str = json_str.rsplit("```", 1)[0]
            
            parsed = json.loads(json_str.strip())

            # Validate required fields exist
            required_fields = ["compliance_status", "explanation"]
            for field in required_fields:
                if field not in parsed:
                    logger.warning(f"[AI] LLM response missing required field: {field}")
                    return None

            return parsed

        except json.JSONDecodeError as e:
            logger.warning(f"[AI] Failed to parse LLM JSON response: {e}")
            return None
        except Exception as e:
            logger.warning(f"[AI] LLM call failed: {type(e).__name__}: {e}")
            return None

    # ─── Keyword-Based Fallback Methods ──────────────────────────────

    def _classify_category(self, user_category: str, description: str, policies: List[PolicyRule]):
        desc_lower = (description or "").lower()
        user_cat_lower = (user_category or "").lower()

        best_match = None
        highest_score = 0
        
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
                return "General Expense", 0.40, True

        if best_match and best_match.lower() != user_cat_lower:
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

        if deterministic_results.get("invalid_fields"):
            invalid = ", ".join(deterministic_results["invalid_fields"])
            reasons.append(f"Invalid or missing claim fields: {invalid}.")
            missing_info = f"Please provide valid values for: {invalid}."
            return "NEEDS_CLARIFICATION", " ".join(reasons), missing_info

        if deterministic_results.get("is_duplicate"):
            dup_ids = ", ".join(str(i) for i in deterministic_results.get("duplicate_of_claim_ids", []))
            reasons.append(f"Potential duplicate claim detected (matching Claim ID(s): #{dup_ids}). Policy evidence [{policy_citation}]: Duplicate submissions for identical expenses are prohibited.")
            return "REQUIRES_REVIEW", " ".join(reasons), missing_info

        if deterministic_results.get("missing_receipt"):
            reasons.append(f"Receipt is required for {claim.category} claims exceeding threshold under policy [{policy_citation}].")
            missing_info = f"Please upload an itemized receipt for your {claim.currency} {claim.amount:.2f} {claim.category} expense."
            return "NEEDS_CLARIFICATION", " ".join(reasons), missing_info

        if deterministic_results.get("exceeds_category_limit"):
            limit = deterministic_results.get("category_limit_amount")
            reasons.append(f"Claim amount ({claim.currency} {claim.amount:.2f}) exceeds configured {claim.category} limit ({claim.currency} {limit:.2f}). Policy evidence [{policy_citation}]: {policy_details}")
            return "NON_COMPLIANT", " ".join(reasons), missing_info

        if is_uncertain:
            reasons.append(f"AI classification for claim description ('{claim.description}') is uncertain or ambiguous. Suggested category: '{suggested_category}'. Human review required per policy [{policy_citation}].")
            return "REQUIRES_REVIEW", " ".join(reasons), missing_info

        reasons.append(f"Claim fully complies with policy guidelines. Cited section [{policy_citation}]: {policy_details}")
        return "COMPLIANT", " ".join(reasons), None


def is_uncertain_desc(desc: str) -> bool:
    vague_words = ["stuff", "misc", "something", "personal", "n/a", "expense", "other", "etc"]
    return any(w == desc.strip() for w in vague_words) or len(desc.strip()) < 4
