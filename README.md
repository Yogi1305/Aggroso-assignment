# Expense Claim Policy Review Assistant

An internal full-stack application that reviews employee expense claims against organizational expense policies using **deterministic validation** and an **AI policy reasoning engine**, with a human-in-the-loop reviewer approval workflow.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Running Locally](#running-locally)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Completed Scope](#completed-scope)
- [Excluded Scope](#excluded-scope)
- [Limitations](#limitations)
- [Deployment](#deployment)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                     │
│  Login ─ Dashboard ─ SubmitClaim ─ ClaimDetails ─ Policies ─ Roles│
│                   Axios API Client + JWT Auth                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST API (JSON)
┌────────────────────────────▼─────────────────────────────────────┐
│                     FastAPI Backend (Python)                      │
│                                                                  │
│  ┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │   Auth API   │  │    Claims API      │  │  Policies API    │  │
│  │  register    │  │  create / list     │  │  list / create   │  │
│  │  login       │  │  evaluate          │  │                  │  │
│  │  role-request│  │  decision          │  └──────────────────┘  │
│  │  role-approve│  │  upload-receipt    │                        │
│  └──────────────┘  └──────┬─────────────┘                        │
│                           │                                      │
│               ┌───────────▼────────────┐                         │
│               │  Evaluation Pipeline   │                         │
│               │                        │                         │
│               │  1. Deterministic      │  ← Rule-based checks    │
│               │     Validator          │    (duplicates, limits,  │
│               │                        │     receipts, fields)    │
│               │  2. AI Policy Engine   │  ← Category classifier, │
│               │     (Groq LLM)        │    compliance reasoning, │
│               │                        │    policy citations      │
│               └───────────┬────────────┘                         │
│                           │                                      │
│               ┌───────────▼────────────┐                         │
│               │  SQLite / PostgreSQL   │  ← Claims, Policies,    │
│               │  (SQLAlchemy ORM)      │    Users, Decisions,     │
│               │                        │    RoleRequests           │
│               └────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

### Claim Evaluation Flow

1. **Employee submits** a claim via the frontend form (single or batch).
2. **Deterministic Validator** runs rule-based checks: duplicate detection, receipt requirements, category spending limits, field validation.
3. **AI Policy Engine** classifies ambiguous descriptions into policy categories, retrieves relevant policy sections, explains compliance reasoning, cites policy evidence, and flags uncertain classifications.
4. **Reviewer/Admin** sees the combined audit report and can: Approve, Reject, Request Clarification, or Override the AI classification with a reason.
5. **Employee** receives feedback with the reviewer reason and can Reclaim/Resubmit.

---

## Tech Stack

| Layer       | Technology                                                  |
| :---------- | :---------------------------------------------------------- |
| Frontend    | React 19, Vite 8, React Router 7, Axios, Lucide Icons       |
| Styling     | Vanilla CSS (glassmorphism dark theme, animations)           |
| Backend     | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2              |
| Auth        | JWT (python-jose), bcrypt password hashing                   |
| AI/LLM      | Groq API (OpenAI-compatible), keyword-based classifier       |
| Database    | SQLite (dev) / PostgreSQL via Supabase (prod)                |
| Logging     | Loguru (structured file + console logs)                      |
| Testing     | pytest + FastAPI TestClient                                  |

---

## Setup & Installation

### Prerequisites

- Python 3.10+ with `pip`
- Node.js 18+ with `npm`
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the Repository

```bash
git clone https://github.com/Yogi1305/Aggroso-assignment.git
cd Aggroso-assignment
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\activate
# Activate (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Seed Demo Data (Optional)

```bash
cd backend
python seed_data.py
```

This seeds sample policy rules (Meals, Travel, Software, Office Supplies, Client Entertainment) and example claims with pre-evaluated results.

---

## Running Locally

### Start Backend (Port 8000)

```bash
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/

### Start Frontend (Port 5173)

```bash
cd frontend
npm run dev
```

- App: http://127.0.0.1:5173/

### Default Test Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@test.com` | `admin123` | Full audit access, policy management, role request approvals |
| **User (Employee)** | `user@test.com` | `user123` | Submit claims, view own claim audit history & feedback |

Registering a new account will default to `user` role for security. Users can request role upgrades from the **Role Requests** page in the UI.


---

## Running Tests

```bash
cd backend
.\.venv\Scripts\activate
python -m pytest tests/test_backend.py -v
```

### Test Coverage

| Test                              | What it validates                                                   |
| :-------------------------------- | :------------------------------------------------------------------ |
| `test_create_and_evaluate_claim`  | End-to-end claim creation → deterministic + AI evaluation pipeline  |
| `test_reviewer_override_category` | Reviewer role override of AI classification with reason enforcement  |

Tests verify core behaviors: claim persistence, deterministic receipt/limit detection, AI compliance status output, and RBAC-protected reviewer actions.

---

## Project Structure

```
Aggroso/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py           # Auth, JWT, role request/approval endpoints
│   │   │   ├── claims.py         # Claim CRUD, evaluate, decision, receipt upload
│   │   │   └── policies.py       # Policy rule management (admin/reviewer only)
│   │   ├── models/
│   │   │   └── models.py         # SQLAlchemy models (User, Claim, PolicyRule, etc.)
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_policy_engine.py         # AI classification & compliance reasoning
│   │   │   └── deterministic_validator.py  # Rule-based validation checks
│   │   ├── config.py             # Settings from .env
│   │   ├── database.py           # SQLAlchemy engine & session
│   │   └── main.py               # FastAPI app setup, middleware, static mounts
│   ├── tests/
│   │   └── test_backend.py       # pytest test suite
│   ├── uploads/receipts/         # Uploaded receipt file storage
│   ├── logs/                     # Loguru application logs
│   ├── requirements.txt
│   ├── seed_data.py              # Demo data seeder
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ClaimStatusBadge.jsx   # Dynamic status badge component
│       │   ├── Navbar.jsx             # Top navigation bar with user info
│       │   └── Sidebar.jsx            # Navigation sidebar with role-aware links
│       ├── context/
│       │   └── AuthContext.jsx        # React auth state management
│       ├── pages/
│       │   ├── Login.jsx              # Registration & login (role selector removed)
│       │   ├── Dashboard.jsx          # Claims overview with analytics & filters
│       │   ├── SubmitClaim.jsx        # Single & batch claim submission + receipt upload
│       │   ├── ClaimDetails.jsx       # Full audit view + reviewer actions + reclaim
│       │   ├── PolicyManagement.jsx   # Policy rules (PDF extractor: upcoming)
│       │   └── RoleRequestsPage.jsx   # Role upgrade request & admin approval
│       ├── services/
│       │   └── api.js                 # Axios API client with JWT interceptor
│       ├── App.jsx                    # Router & layout
│       └── index.css                  # Global design system
├── README.md
├── AGENT_USAGE.md
├── .env.example
└── .gitignore
```

---

## Completed Scope

### ✅ Claim Format & Submission
- All 7 claim fields (claimant, date, category, amount, currency, description, receipt available)
- Single claim and batch claim submission
- Receipt file upload (images, PDFs) with server-side storage

### ✅ AI Workflow
- Classify ambiguous claim descriptions into policy categories (keyword-based + pattern matching)
- Retrieve relevant policy sections with evidence citations
- Explain compliance, clarification needs, or review requirements
- Ask for missing information (e.g., missing receipts)
- Cite policy evidence behind each finding
- Clearly mark uncertain/low-confidence classifications

### ✅ Deterministic Validation
- Duplicate claim detection (same claimant + amount + currency + date/description)
- Total calculations with per-currency and per-category breakdowns
- Missing receipt identification against configured policy thresholds
- Category spending limit checking
- Date format and required field validation

### ✅ Reviewer Actions
- Approve claims
- Reject claims (with reason visible to employee)
- Request clarification (employee sees feedback + can reclaim)
- Override AI classification with mandatory reason and new category
- View complete review and decision audit history timeline

### ✅ Security & RBAC
- JWT-based authentication with bcrypt password hashing
- Default registration as `user` role (no self-escalation)
- Role upgrade request workflow with admin approval/rejection
- Backend endpoint guards: only reviewer/admin can perform reviews
- Claim privacy scoping: employees see only their own claims

### ✅ UI/UX
- Dark glassmorphism design with smooth animations
- Loading, empty, success, validation, and error states across all pages
- Responsive layout with sidebar navigation
- Real-time status badges and analytics dashboard

### ✅ Logging
- Structured Loguru logging: console (INFO) + rotating file (DEBUG)
- HTTP request/response logging middleware with timing
- Global exception handler for unhandled errors

---

## Excluded Scope

The following are **intentionally excluded** as stated in the problem requirements:

| Feature                  | Reason                                    |
| :----------------------- | :---------------------------------------- |
| Actual reimbursement     | Not required per specification             |
| Payroll integration      | Not required per specification             |
| Tax advice               | Not required per specification             |
| Receipt OCR              | Not required per specification             |
| Payment processing       | Not required per specification             |
| PDF policy extractor     | Marked as "Upcoming Feature" in UI         |
| Email notifications      | Out of scope; reviewer feedback is in-app  |

---

## Limitations

1. **AI Engine**: Uses keyword-matching heuristics rather than a live LLM API call for category classification. The Groq LLM integration is configured but the current classifier operates deterministically for reliability and speed. Extending to real-time LLM calls requires only modifying `ai_policy_engine.py`.

2. **Database**: Default SQLite for local development. For production, switch `DATABASE_URL` to PostgreSQL (Supabase connection string provided in `.env.example`).

3. **Receipt Storage**: Files are stored locally on the server filesystem (`backend/uploads/receipts/`). For production, integrate with cloud storage (e.g., S3, GCS).

4. **Admin Bootstrap**: The first admin must be promoted manually in the database or via seed script. There is no self-service admin creation path (by design for security).

5. **Session Management**: JWT tokens are stored in `localStorage`. For production, consider `httpOnly` cookies and token refresh mechanisms.

---

## Deployment

### Production Build

```bash
# Frontend production build
cd frontend
npm run build
# Output: frontend/dist/

# Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Environment Variables for Production

See [`.env.example`](.env.example) for all required configuration. Key variables:

| Variable         | Description                              |
| :--------------- | :--------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string (Supabase)  |
| `GROQ_API_KEY`   | Groq API key for LLM evaluation          |
| `SECRET_KEY`     | JWT signing secret (change in production)|
| `LLM_MODEL`      | LLM model identifier                    |

### Deployment Options

- **Backend**: Deploy FastAPI on Render, Railway, or any Docker-compatible platform
- **Frontend**: Deploy Vite build to Vercel, Netlify, or serve via FastAPI static mount
- **Database**: Supabase PostgreSQL (connection string in `.env`)

---

## License

This project was built as an assignment submission.
