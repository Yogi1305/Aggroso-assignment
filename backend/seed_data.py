from app.database import Base, engine, SessionLocal
from app.models.models import PolicyRule, Claim, ClaimStatus
from app.services.deterministic_validator import DeterministicValidator
from app.services.ai_policy_engine import AIPolicyEngine

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing
    from app.models.models import ClaimValidationResult, ReviewDecision
    db.query(ClaimValidationResult).delete()
    db.query(ReviewDecision).delete()
    db.query(Claim).delete()
    db.query(PolicyRule).delete()
    db.commit()

    print("Seeding Policy Rules...")
    policies = [
        PolicyRule(
            category="Meals",
            max_amount=75.00,
            currency="USD",
            receipt_required=True,
            receipt_threshold=25.00,
            description_pattern="lunch, dinner, breakfast, food, restaurant, coffee, dining",
            policy_citation="Sec 3.1 - Daily Meal Expenses",
            policy_details="Individual meal expenses are capped at $75.00 per day. Receipts are mandatory for any meal expense exceeding $25.00."
        ),
        PolicyRule(
            category="Travel",
            max_amount=500.00,
            currency="USD",
            receipt_required=True,
            receipt_threshold=15.00,
            description_pattern="flight, train, taxi, uber, lyft, cab, fare, parking, hotel, lodging, toll",
            policy_citation="Sec 4.2 - Business Travel & Transit",
            policy_details="Ground transit and domestic travel expenses up to $500 per trip. Receipts required for fares above $15.00."
        ),
        PolicyRule(
            category="Software",
            max_amount=150.00,
            currency="USD",
            receipt_required=True,
            receipt_threshold=0.00,
            description_pattern="subscription, license, software, saas, github, copilot, aws, cloud, app",
            policy_citation="Sec 6.0 - IT & Software Subscriptions",
            policy_details="Software tool purchases or recurring monthly subscriptions up to $150 require prior manager notification and itemized invoice receipt."
        ),
        PolicyRule(
            category="Office Supplies",
            max_amount=100.00,
            currency="USD",
            receipt_required=True,
            receipt_threshold=20.00,
            description_pattern="paper, pen, desk, monitor, cable, stationery, keyboard, mouse",
            policy_citation="Sec 2.4 - Office Equipment & Supplies",
            policy_details="Home office or work supplies capped at $100 per claim with valid receipt for purchases over $20."
        )
    ]
    db.add_all(policies)
    db.commit()

    print("Seeding Sample Expense Claims...")
    sample_claims = [
        # Claim 1: Fully Compliant Meal
        Claim(
            claimant="Sarah Jenkins",
            date="2026-09-28",
            category="Meals",
            original_category="Meals",
            amount=42.50,
            currency="USD",
            description="Client lunch meeting at Olive Garden during quarterly review",
            receipt_available=True,
            status=ClaimStatus.PENDING_REVIEW.value
        ),
        # Claim 2: Missing Receipt (> $25)
        Claim(
            claimant="David Miller",
            date="2026-09-29",
            category="Meals",
            original_category="Meals",
            amount=65.00,
            currency="USD",
            description="Team dinner celebration after product milestone launch",
            receipt_available=False, # Missing receipt!
            status=ClaimStatus.PENDING_REVIEW.value
        ),
        # Claim 3: Exceeds Category Limit ($500 limit)
        Claim(
            claimant="Alex Rivera",
            date="2026-09-30",
            category="Travel",
            original_category="Travel",
            amount=780.00,
            currency="USD",
            description="Last-minute flight ticket for urgent customer site intervention",
            receipt_available=True,
            status=ClaimStatus.PENDING_REVIEW.value
        ),
        # Claim 4: Ambiguous description needing classification
        Claim(
            claimant="Elena Rostova",
            date="2026-10-01",
            category="Unclassified",
            original_category="Unclassified",
            amount=28.00,
            currency="USD",
            description="Uber cab rides to tech conference center",
            receipt_available=True,
            status=ClaimStatus.PENDING_REVIEW.value
        ),
        # Claim 5: Duplicate Claim of Claim 1
        Claim(
            claimant="Sarah Jenkins",
            date="2026-09-28",
            category="Meals",
            original_category="Meals",
            amount=42.50,
            currency="USD",
            description="Client lunch meeting at Olive Garden during quarterly review",
            receipt_available=True,
            status=ClaimStatus.PENDING_REVIEW.value
        ),
    ]
    db.add_all(sample_claims)
    db.commit()

    # Evaluate seeded claims
    claims = db.query(Claim).all()
    validator = DeterministicValidator(db)
    ai_engine = AIPolicyEngine(db)

    print("Running initial evaluation on seeded claims...")
    for c in claims:
        det_res = validator.validate_claim(c)
        ai_res = ai_engine.evaluate_claim_policy(c, det_res)
        
        val = db.query(Claim).filter(Claim.id == c.id).first()
        from app.models.models import ClaimValidationResult
        c_val = ClaimValidationResult(
            claim_id=c.id,
            is_duplicate=det_res["is_duplicate"],
            duplicate_of_claim_ids=det_res["duplicate_of_claim_ids"],
            missing_receipt=det_res["missing_receipt"],
            exceeds_category_limit=det_res["exceeds_category_limit"],
            category_limit_amount=det_res["category_limit_amount"],
            invalid_fields=det_res["invalid_fields"],
            ai_suggested_category=ai_res["ai_suggested_category"],
            is_uncertain=ai_res["is_uncertain"],
            confidence_score=ai_res["confidence_score"],
            compliance_status=ai_res["compliance_status"],
            explanation=ai_res["explanation"],
            policy_citation=ai_res["policy_citation"],
            missing_info_request=ai_res["missing_info_request"]
        )
        db.add(c_val)
        c.is_evaluated = True

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_database()
