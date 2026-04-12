# Bitcamp Hackathon — Master Coordination File

## Project Overview

- **Project Name:** TourGuide
- **One-liner:** Point your camera at any scene — the app reads the environment and tells you how to navigate it, for someone who feels like an alien in an unfamiliar world.
- **Track:** Machine Learning
- **Theme:** Aliens (you are the alien)
- **Demo target:** Live camera → scene classification → social dynamics → spoken guidance

## Agent Roles & Ownership

| Role         | Working directory        | Owns                                                                  |
| ------------ | ------------------------ | --------------------------------------------------------------------- |
| Architect    | `/` (root)               | `docs/architecture.md`, `docs/api-contract.md`, `docs/data-models.md` |
| Backend      | `backend/`               | API routes, DB schema, business logic                                 |
| Frontend     | `frontend/`              | UI, state management, API integration                                 |
| ML/AI        | `ml/` (create if needed) | Models, embeddings, inference calls                                   |
| Integrations | root                     | External APIs, auth, deployment config                                |

## Coordination Protocol

### The Golden Rule

**Agents communicate through files in `docs/`, not by assuming.**
Before implementing anything that touches another agent's domain, write your contract to `docs/api-contract.md` or `docs/decisions.md` first.

### Workflow

1. **Architect goes first** — fills in architecture, API contract, and data models before other agents start
2. **Backend and Frontend run in parallel** after the contract is set
3. **Any breaking change** to `docs/api-contract.md` or `docs/data-models.md` must be logged in `docs/decisions.md` with a timestamp

### Shared State Files (read these before starting any session)

- `docs/architecture.md` — system design, tech choices, rationale
- `docs/api-contract.md` — all API endpoints, request/response shapes
- `docs/data-models.md` — canonical data types shared across frontend/backend
- `docs/decisions.md` — log of decisions made and why (append-only)
- `docs/todo.md` — cross-cutting tasks and blockers

## Hackathon Constraints

- **Prioritize demo-ability** over production-readiness
- Hardcode where it's faster; mark with `# DEMO_ONLY` comments
- Keep the core user flow working at all times — don't break the happy path
- If stuck >15 minutes on something, log it in `docs/decisions.md` and move around it

## Tech Decisions

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Python + FastAPI
- **ML Models:** CLIP (scene classification) + MediaPipe (people/pose detection)
- **AI Guidance:** Gemini Flash API (free tier)
- **Voice:** ElevenLabs (free tier)
- **Database:** MongoDB Atlas (free tier) — added in V2
- **Auth:** Auth0 (free tier) — added in V2
- **Deploy:** Cloudflare (frontend) + DigitalOcean (backend) — added after core works
- **Ports:** Frontend: 5173 | Backend: 8000

## Prize Tools

See `docs/prizes.md` for full details and access links.

**Priority: project quality and usability first.**
When a feature needs a tool, check if a prize tool is the natural best fit — if it is,
use it. Never sacrifice usability or add friction just to stack a prize.

| Feature needs       | Prize tool available | Prize                   |
| ------------------- | -------------------- | ----------------------- |
| User auth           | Auth0                | Auth0 + Auth0 AI Agents |
| Database            | MongoDB Atlas        | MongoDB                 |
| AI reasoning        | Claude API           | Gen AI                  |
| Vision / multimodal | Gemini API           | Gemini                  |
| Voice output        | ElevenLabs           | ElevenLabs              |
| RAG / retrieval     | Snowflake API        | Snowflake               |
| Deployment          | Cloudflare Workers   | Cloudflare              |
| Domain              | .tech via GoDaddy    | .Tech + GoDaddy         |

If theme touches frontline workers → flag for Reach Capital (investor meeting prize).
