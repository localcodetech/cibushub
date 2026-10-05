# ADR 001: Server structure

- **Status:** Accepted
- **Date:** 2026-10-05
- **Step:** 2 (Backend Architecture)

## Context

The server starts as one Express app and will grow to cover auth, restaurants, menus, orders, payments, riders, notifications and admin. Without a fixed structure, request handling, business rules and database code end up mixed in the same files, which makes them hard to test and easy to break.

## Decision

The server is split into layers. Each layer has one job and only calls the layer below it.

| Folder | Job | May call |
|---|---|---|
| `routes/` | Map a URL and method to a controller, with middleware (auth, validation) | controllers, middlewares |
| `controllers/` | Read the request, call a service, send the response with `sendSuccess` | services |
| `services/` | Business rules (pricing, order transitions, permissions on data) | repositories, other services |
| `repositories/` | All database queries for one model: find, create, update, delete, with transactions passed in | models |
| `models/` | Sequelize models: tables, columns, associations | — |
| `middlewares/` | Code that runs around routes: auth, validation, 404, error handler | utils |
| `config/` | Validated environment (`env/`), logger, database and Redis connections | — |
| `utils/` | Small shared helpers with no business logic (`AppError`, response helper) | — |

Supporting rules:

- **App and bootstrap are separate.** `app.js` builds the Express app; `index.js` only starts it and handles shutdown. Tests import `app.js` without opening a port.
- **Only `config/env/env.js` reads `process.env`.** Everything else imports the validated `env` object, and the app refuses to start on invalid config (AC-SEC-09).
- **Controllers never contain business logic.** If a controller needs an `if` about business rules, that code belongs in a service.
- **Errors are thrown, not sent.** Any layer throws `AppError`; only `errorHandler` turns errors into responses ([error-codes.md](../error-codes.md)).
- **Services never query the database directly.** Every Sequelize call lives in a repository, so database details (includes, scopes, locking) stay in one place and services can be unit-tested with fake repositories.
- **Global middleware order** in `app.js`: request logger (with request ID) → Helmet → CORS → JSON body parser (100 kb) → routes → 404 → error handler.
- **Business endpoints** are mounted under `/api/v1`; the health check is at `/api/health`.

## Consequences

- Each feature adds a predictable set of files: a route, a controller, a service, a repository, a model and a Zod schema.
- Services can be unit-tested without HTTP, and the app can be tested with Supertest without starting a server.
- Some simple endpoints will have thin pass-through layers; this is accepted for consistency.
- Folders for background jobs and sockets will be added when Steps 9 and 10 need them.
