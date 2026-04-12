# Data Models

> Single source of truth for shared types.
> Written by: Architect role
> Consumed by: Frontend and Backend roles

## Naming Conventions
- Use camelCase for JSON fields
- Use snake_case for DB columns
- IDs are strings (UUIDs or similar) unless otherwise noted

## Models

> Add models below once the domain is known

### Template
```
ModelName {
  id: string          // unique identifier
  createdAt: string   // ISO 8601
  // ...fields
}
```
