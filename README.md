# Expense Claim Policy Review Assistant

An intelligent internal full-stack enterprise API service built with **FastAPI**, **SQLAlchemy**, and **Groq/OpenAI LLM Integration**. It automates employee expense claim reviews against organizational expense policies by combining **Deterministic Business Validation** (duplicate detection, limit caps, receipt enforcement) with **AI-Powered Policy Reasoning** (ambiguous classification, policy section retrieval, compliance explanations, and uncertainty flags).

---

## ⚡ Quick Start & Run Commands

Follow these steps to get the application up and running locally:

### 1. Clone & Navigate to Backend
```bash
cd backend
```

### 2. Environment Setup & Requirements (`.env`)
Create a `.env` file inside the `backend/` directory (or copy `.env.sample`):

```bash
cp .env.sample .env
```

Ensure your `backend/.env` file contains the required environment variables:

```env
# Application Configuration
APP_NAME="Expense Claim Policy Review Assistant API"

# Database Configuration (SQLite default, or Supabase PostgreSQL)
DATABASE_URL="sqlite:///./expense_claims.db"

# JWT Secret Key
SECRET_KEY="your-super-secret-key-for-jwt-signing"

# Groq / LLM Integration Configuration
GROQ_API_KEY="your_groq_api_key_here"
OPENAI_API_KEY="your_groq_api_key_here"
OPENAI_BASE_URL="https://api.groq.com/openai/v1"
LLM_MODEL="openai/gpt-oss-20b"

```

### 3. Installation Guide

```bash
# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install all project dependencies
pip install -r requirements.txt
```

### 4. Run Commands

```bash
# Step A: Seed initial database with sample policies, claims, and default users
python seed_data.py

# Step B: Start the development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 5. Access Interactive API Documentation
- **Swagger UI (Interactive Docs)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Architecture & Core Features

### 1. User Authentication & Role-Based Access Control (RBAC)
- **User Registration & JWT Login**: Secure authentication with password hashing (`bcrypt`) and JSON Web Tokens.
- **Roles & Permissions**:
  - `user`: Submit single or batch expense claims.
  - `reviewer`: Review, evaluate claims, request clarifications, or approve/reject claims.
  - `admin`: Manage organizational policy rules, perform approvals/rejects, and configure AI settings.

### 2. Deterministic Validation Engine
- **Duplicate Detection**: Identifies duplicate claims submitted across claimant, amount, currency, and date windows.
- **Receipt Compliance**: Enforces mandatory receipt policies per category or threshold limits.
- **Policy Limit Enforcement**: Checks claims against max allowable amounts per category.
- **Field & Date Validation**: Validates required fields, currency formats, and ISO dates.
- **Batch Totals & Analytics**: Aggregates claim counts, currency totals, and category breakdowns.

### 3. AI Policy Evaluation Engine (Powered by Groq / LLM)
- **Ambiguous Description Classification**: Automatically classifies vague descriptions (e.g. "dinner with client during trip") into concrete policy categories.
- **Uncertainty Flagging**: Explicitly flags low-confidence or ambiguous classifications so reviewers pay special attention.
- **Policy Section Retrieval & Evidence Citation**: Cites exact policy rules and clauses backing every evaluation finding.
- **Compliance Reasoning**: Generates plain-text explanations explaining compliance status (`COMPLIANT`, `REQUIRES_REVIEW`, `NEEDS_CLARIFICATION`, `NON_COMPLIANT`).

### 4. Reviewer Workflow & Audit History
- **Reviewer Actions**: Approve, Reject, or Request Clarification on submitted claims.
- **AI Classification Override**: Allows human reviewers to override AI-suggested categories with mandatory audit reasons.
- **Audit Trail**: Maintains full timeline of claim creation, AI evaluations, and reviewer decisions.

---

## Tech Stack

- **Framework**: Python 3.10+, FastAPI, Pydantic v2
- **Database & ORM**: SQLite (Local) / PostgreSQL (Supabase), SQLAlchemy 2.0
- **Authentication**: JWT (`python-jose`), Passlib (`bcrypt`)
- **LLM Provider**: Groq API (`openai/gpt-oss-20b` / Llama 3) with OpenAI API fallback compatibility

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/auth/register` | Register a new user (`user`, `reviewer`, `admin`) | Public |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token + role | Public |
| `POST` | `/api/auth/logout` | Client token invalidation notice | Public |

### Policy Management (`/api/policies`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET` | `/api/policies` | List all organizational policy rules | Authenticated |
| `POST` | `/api/policies` | Create or update category policy rules | Admin / Reviewer |

### Claims & Reviews (`/api/claims`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/claims` | Create a single expense claim | Authenticated |
| `POST` | `/api/claims/batch` | Batch submit expense claims | Authenticated |
| `GET` | `/api/claims` | List claims (filterable by status/claimant) | Authenticated |
| `GET` | `/api/claims/summary/totals` | Retrieve claim totals and analytics | Authenticated |
| `GET` | `/api/claims/{id}` | Get detailed claim & validation results | Authenticated |
| `POST` | `/api/claims/{id}/evaluate` | Trigger Deterministic & AI Policy evaluation | Authenticated |
| `POST` | `/api/claims/{id}/decision` | Record approval, rejection, or category override | Reviewer / Admin |
| `GET` | `/api/claims/{id}/history` | Retrieve full decision audit log | Authenticated |
