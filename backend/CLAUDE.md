# Backend Role

Own: `backend/` only
Context: read `docs/snapshot.md` at session start (not all 5 docs files)

Rules:
- Implement endpoints exactly as in `docs/api-contract.md` — Frontend depends on exact shapes
- Server must be startable with one command at all times
- Mark shortcuts `# DEMO_ONLY`
- Any contract change → update `docs/api-contract.md` + log in `docs/decisions.md`
- DB schema changes that affect shared types → update `docs/data-models.md`
