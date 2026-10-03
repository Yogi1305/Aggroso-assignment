# AGENT_USAGE.md — AI Agent Usage Documentation

This document describes how AI coding agents (Gemini and Claude) were used during the development of the Expense Claim Policy Review Assistant, including tools used, representative prompts, delegated work, agent mistakes, and output verification methods.

---

## Tools & Models Used

| Tool / Technology         | Purpose & Role                                                         |
| :------------------------ | :--------------------------------------------------------------------- |
| **Gemini Models (Flash & Pro)** | **Primary AI Coding Agent**: Used for all code generation, backend API development, frontend building, UI refactoring, database migrations, debugging, and deployment configurations. |
| **Claude Opus**           | **Architectural Planning Agent**: Used strictly for initial implementation planning, high-level system architecture design, and creating structured documentation. |
| **VS Code**               | Primary IDE for pair programming and code editing with agent integration.|
| **Git + GitHub**           | Version control, repository management, and deployment triggers.        |
| **FastAPI TestClient**     | Automated backend integration testing.                                 |
| **Browser DevTools**       | Frontend debugging, network inspection, and responsive design checks.  |
| **Loguru**                 | Structured application logging for runtime verification.               |

---

## Representative Prompts

Below are paraphrased examples of the actual prompts given to the AI agent during development, grouped by feature area:

### Backend Architecture & API Design

1. *"Build a Python FastAPI backend that combines deterministic business validation with an AI-driven policy evaluation engine for expense claims."*  
   → Generated the full backend scaffold: models, schemas, services, and API routes.

2. *"Add authentication with JWT tokens, bcrypt password hashing, and role-based access control."*  
   → Created `auth.py` with register, login, and `get_current_user` dependency.

3. *"If anyone can create an account with role admin or reviewer, then there's a problem. Fix this — register everyone as user, and admin approval is needed for role upgrades."*  
   → Hardcoded registration to `user` role, created `RoleRequest` model and approval endpoints.

### Frontend UI

4. *"Build a responsive React.js frontend with Vite, using glassmorphism dark theme and modern design."*  
   → Generated all 6 page components, sidebar, navbar, and the full CSS design system.

5. *"On frontend, still showing the role during creation."*  
   → Removed the role selector from the registration form in `Login.jsx`.

6. *"When user selects 'have receipt', show upload file/image option, and backend also save on server."*  
   → Added receipt file upload UI in `SubmitClaim.jsx`, upload endpoint in `claims.py`, and static file serving in `main.py`.

### Security & Access Control

7. *"User yogeshkuswaha@gmail.com should not see the claims of John Doe. Users should only see their own claims."*  
   → Added role-based scoping in `list_claims` and `get_claim_totals` — employees see only their own claims.

8. *"Disable the click on automatic PDF policy extractor and mark it as upcoming feature."*  
   → Disabled the upload button, added `UPCOMING FEATURE` badge, and grayed out the section.

### Claim Feedback & Reclaim

9. *"If any user's claim gets rejected or is pending, does he get the response on that claim with reason so he can reclaim it?"*  
   → Added rejection/clarification feedback banner in `ClaimDetails.jsx` with reviewer reason display and a "Reclaim / Resubmit" button that pre-fills the submit form.

---

## Work Delegated to the Agent

| Task                                      | Agent Contribution                                               |
| :---------------------------------------- | :--------------------------------------------------------------- |
| Database model design                     | Generated all SQLAlchemy models (User, Claim, PolicyRule, etc.)  |
| Pydantic schema definitions               | Generated all request/response schemas with validation           |
| Deterministic validation service          | Full implementation of duplicate, receipt, limit, field checks    |
| AI policy engine                          | Category classifier with keyword matching and compliance reasoning|
| JWT authentication flow                   | Full register/login/logout with bcrypt and JWT token generation  |
| Role-based access control                 | Registration hardening, role request model, approval endpoints   |
| React component scaffolding              | All 6 pages, 3 components, routing, auth context                 |
| CSS design system                         | Full glassmorphism dark theme with animations                    |
| Receipt upload pipeline                   | Frontend file input, backend upload endpoint, static serving     |
| Test suite                                | pytest tests for claim evaluation and reviewer override          |
| Seed data script                          | Demo policies and sample claims with evaluation results          |

---

## Important Agent Mistakes or Rejected Suggestions

### 1. Registration Self-Escalation (Critical Security Bug)
**What happened**: The agent initially generated the registration endpoint allowing users to self-assign any role (including `admin` or `reviewer`) by simply passing it in the request body.  
**How it was caught**: Manual review of the registration flow — the user identified this as a critical security flaw.  
**Resolution**: Registration was hardened to always assign `user` role. A separate `RoleRequest` approval workflow was implemented.

### 2. Missing `settings` Import After Refactoring
**What happened**: During a refactoring of `auth.py`, the agent removed the `from app.config import settings` import but still referenced `settings` in the `SECRET_KEY` initialization, causing a `NameError`.  
**How it was caught**: IDE lint error (Pyrefly) flagged `Could not find name 'settings'`.  
**Resolution**: Re-added the import in the next edit.

### 3. Claims Visible Across Users
**What happened**: The `GET /claims` and `GET /claims/summary/totals` endpoints returned all claims regardless of the requesting user's role, meaning a regular employee could see other employees' claims.  
**How it was caught**: The user tested with two accounts and observed cross-user claim visibility.  
**Resolution**: Added role-based query scoping — employees see only their own claims (filtered by email or name), while reviewers/admins see all claims.

### 4. Frontend Role Selector Not Removed
**What happened**: After hardening the backend to ignore the role field during registration, the frontend registration form still displayed the Employee/Reviewer/Admin role selector buttons.  
**How it was caught**: User tested the registration page and reported the role selector was still visible.  
**Resolution**: Removed the entire role selection UI block from `Login.jsx`.

### 5. Test Failures After RBAC Changes
**What happened**: After implementing RBAC, the test helper `get_auth_headers("reviewer")` registered a user with role `reviewer`, but registration now forces `user` role. The test user lacked reviewer permissions to perform review actions.  
**How it was caught**: `pytest` failures.  
**Resolution**: Updated the test helper to directly set the user's role in the database after registration before logging in.

---

## How Output Was Verified

### 1. Automated Testing
```bash
python -m pytest tests/test_backend.py -v
```
- **Claim creation + evaluation pipeline**: Verifies end-to-end flow from claim creation through deterministic and AI evaluation, asserting correct `missing_receipt`, `compliance_status`, and `missing_info_request` values.
- **Reviewer override**: Verifies RBAC-protected category override with reason enforcement, and confirms the claim's category is updated in the database.

### 2. Manual Browser Testing
- Registered accounts with both `user` and `admin` roles
- Verified claim visibility scoping (employee sees only own claims)
- Tested claim submission → AI evaluation → reviewer approve/reject flow
- Confirmed rejection feedback is visible to the employee with reviewer reason
- Tested receipt file upload and verified file appears on server
- Tested role upgrade request and admin approval workflow
- Verified PDF extractor button is disabled with "Upcoming Feature" badge

### 3. API Testing via Swagger
- Used FastAPI's built-in `/docs` Swagger UI to test all endpoints directly
- Verified JWT token authentication across all protected endpoints
- Tested error responses for unauthorized access (403), missing data (400), and not found (404)

### 4. Structured Log Inspection
- Reviewed `backend/logs/app.log` for request timing, error traces, and startup messages
- Verified HTTP middleware logs show correct status codes and response times
- Checked that Loguru captures unhandled exceptions with full tracebacks

### 5. Network & DevTools Inspection
- Used browser DevTools Network tab to verify API request/response payloads
- Confirmed JWT tokens are correctly attached to all authenticated requests
- Verified CORS headers allow frontend-backend communication

---

## Summary

The AI agent was instrumental in accelerating development across the full stack — from database models and API endpoints to React components and CSS styling. The most significant value came from rapid scaffolding of boilerplate code, while the most important human interventions were around security hardening (registration role escalation, claim visibility scoping) and UX decisions. Every agent-generated change was verified through a combination of automated tests, manual browser testing, API validation, and structured log review.
