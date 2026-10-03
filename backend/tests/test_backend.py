import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models.models import PolicyRule, Claim, ClaimStatus

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(Claim).delete()
    db.query(PolicyRule).delete()
    db.commit()

    # Seed test policy
    policy = PolicyRule(
        category="Meals",
        max_amount=50.00,
        currency="USD",
        receipt_required=True,
        receipt_threshold=20.00,
        description_pattern="lunch, dinner, food",
        policy_citation="Sec 3.1 - Meals",
        policy_details="Meal max cap $50, receipt required over $20"
    )
    db.add(policy)
    db.commit()
    yield db
    db.close()

def test_create_and_evaluate_claim():
    # 1. Create claim
    payload = {
        "claimant": "John Doe",
        "date": "2026-10-01",
        "category": "Meals",
        "amount": 35.00,
        "currency": "USD",
        "description": "Lunch meeting with partner",
        "receipt_available": False # Receipt missing for > $20
    }
    response = client.post("/api/claims", json=payload)
    assert response.status_code == 200
    claim_id = response.json()["id"]

    # 2. Evaluate claim
    eval_resp = client.post(f"/api/claims/{claim_id}/evaluate")
    assert eval_resp.status_code == 200
    data = eval_resp.json()
    assert data["missing_receipt"] is True
    assert data["compliance_status"] == "NEEDS_CLARIFICATION"
    assert "upload an itemized receipt" in data["missing_info_request"].lower()

def test_reviewer_override_category():
    # Create claim
    payload = {
        "claimant": "Alice Smith",
        "date": "2026-10-02",
        "category": "Unclassified",
        "amount": 15.00,
        "currency": "USD",
        "description": "Taxi cab to airport",
        "receipt_available": True
    }
    create_resp = client.post("/api/claims", json=payload)
    claim_id = create_resp.json()["id"]

    # Decision override
    decision_payload = {
        "action": "OVERRIDE_CLASSIFICATION",
        "reviewer": "Senior Audit Manager",
        "reason": "Description clearly indicates ground transportation",
        "new_category": "Travel"
    }
    dec_resp = client.post(f"/api/claims/{claim_id}/decision", json=decision_payload)
    assert dec_resp.status_code == 200
    assert dec_resp.json()["action"] == "OVERRIDE_CLASSIFICATION"
    assert dec_resp.json()["new_category"] == "Travel"

    # Verify claim category updated
    get_resp = client.get(f"/api/claims/{claim_id}")
    assert get_resp.json()["category"] == "Travel"
