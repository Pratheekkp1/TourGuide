# API Contract

> Written by: Architect/Backend role
> Consumed by: Frontend role
> Last updated: TBD

## Base URL
- Dev: `http://localhost:PORT`
- Prod: TBD

## Auth
TBD (e.g., JWT header `Authorization: Bearer <token>`, session cookie, none)

## Endpoints

### Template
```
METHOD /path
Description: what this does
Auth required: yes/no

Request body:
{
  "field": type  // description
}

Response 200:
{
  "field": type
}

Response 4xx/5xx:
{
  "error": "message"
}
```

---

> Add endpoints below as they are defined
