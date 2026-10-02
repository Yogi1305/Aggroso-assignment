# Expense Claim Policy Review Assistant

An intelligent internal application designed to streamline employee expense claim reviews against organizational expense policies. It combines **deterministic validation** (business rules, limits, duplicates, missing receipts) with an **AI Policy Evaluation Engine** (ambiguous classification, policy section retrieval, reasoning explanations, and evidence citations).

---

## Key Features

### 1. Deterministic Validation Engine
- **Duplicate Detection**: Flags duplicate claims based on claimant, amount, currency, and date window.
- **Missing Receipt Checks**: Enforces mandatory receipt rules per category or transaction threshold.
- **Category Limit Checks**: Identifies claims exceeding configured policy caps.
- **Date & Field Validation**: Verifies date ranges and mandatory fields.
- **Totals & Summary**: Calculates category totals and currency breakdowns.

### 2. AI Policy Review Engine
- **Ambiguous Claim Classification**: Maps unclear or vague expense descriptions to policy categories.
- **Uncertainty Marking**: Explicitly flags low-confidence or ambiguous classifications for human review.
- **Policy Retrieval & Evidence Citation**: Links findings to exact sections of the expense policy.
- **Compliance Explanations**: Details why a claim complies, needs clarification, or requires review.
- **Missing Information Prompts**: Asks claimants targeted questions when required details are missing.

### 3. Reviewer Workflow & Audit Log
- **Reviewer Actions**: Approve, Reject, or Request Clarification.
- **AI Classification Override**: Allows human reviewers to override AI category suggestions with a mandatory reason.
- **Complete Decision History**: Full audit trail of evaluation results, overrides, and reviewer notes.

---

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy, SQLite
- **AI Engine**: Modular policy evaluation engine (supports rule-based intelligent fallback and LLM provider integration)
- **Frontend** *(Upcoming)*: Web user interface for claimants and policy reviewers.

---

## Claim Data Schema

Each claim includes:
1. `claimant`: Name of employee submitting the claim
2. `date`: Claim date (`YYYY-MM-DD`)
3. `category`: Expense category (e.g., Travel, Meals, Software, Supplies, Utilities)
4. `amount`: Numeric value of the claim
5. `currency`: Currency code (e.g., USD, EUR, GBP)
6. `description`: Detailed description of the expense
7. `receipt_available`: `yes` or `no`

---

## API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/policies` | Retrieve active expense policy rules |
| `POST` | `/api/policies` | Create or update expense policy rules |
| `POST` | `/api/claims` | Create a single claim or batch of claims |
| `GET` | `/api/claims` | List claims (filterable by status/claimant) |
| `GET` | `/api/claims/{id}` | Retrieve claim details with validation & AI findings |
| `POST` | `/api/claims/{id}/evaluate` | Run deterministic and AI policy review |
| `POST` | `/api/claims/{id}/decision` | Record reviewer action (Approve, Reject, Clarify, Override) |
| `GET` | `/api/claims/{id}/history` | View complete review and decision audit trail |

---

## Getting Started (Backend)

### 1. Requirements
- Python 3.10+ installed

### 2. Installation & Running

```bash
# Navigate to backend directory (once created)
cd backend

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed sample policy & claims data
python seed_data.py

# Run FastAPI server
uvicorn app.main:app --reload
```

Interactive API documentation will be available at `http://127.0.0.1:8000/docs`.
