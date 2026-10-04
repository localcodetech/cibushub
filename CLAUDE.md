# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CibusHub is a food ordering and delivery system (Ghana market): customers, restaurants, riders, admins. It is in its early scaffolding phase. The planned stack is React (Vite) + Express 5 + Sequelize/MySQL, with Redis, BullMQ, Socket.IO, Paystack, Hubtel/Arkesel, Resend/SendGrid, Google Maps and Cloudinary. Most of this does not exist yet.

Two documents drive all work. Read the relevant sections before you implement anything:

- [CibusHub_Acceptance_Criteria.md](CibusHub_Acceptance_Criteria.md): the source of truth. Criteria have IDs like `AC-<MODULE>-<NN>` and are tagged `[MUST]`, `[SHOULD]` or `[COULD]`. A `[SHOULD]` may only be skipped with a written reason in `docs/`.
- [plan.md](plan.md): a 15-step build plan. Each step lists the criteria it covers, its build order and its "Done when" checks. Only work on the step currently marked IN PROGRESS; don't build ahead into later steps.
- [docs/plan-review.md](docs/plan-review.md): a systems review of the plan. It holds the locked decisions (npm workspaces with `packages/shared`, VPS behind Caddy with same-site `app.`/`api.` domains, a separate worker process, every [COULD] item in scope), the production failure gaps C1–C16, and patch lists to fold into each step.

The user builds this project to learn. Don't write code unless they have tried and are stuck, and explain every line of any code you do write.

## Repository layout

There are two independent npm apps with no root `package.json` or workspaces. Each has its own `package.json`, lock file, Dockerfile and `.dockerignore`.

- `client/`: React 19 + Vite 8, JavaScript, ESM. The Vite dev server binds `0.0.0.0:5173` with `strictPort`.
- `server/`: Express 5, JavaScript, ESM. `src/index.js` is currently a temporary smoke test. Step 2 of the plan replaces it with a layered structure:
  - The app is kept separate from the bootstrap.
  - Layers: config, routes, controllers, services, models, middlewares, validators, utils.
  - Config is validated with Zod and is the only place that reads `process.env`.
- `docs/`: ADRs, ER diagram, permission matrix, state machine and error-code vocabulary. Update these in the same branch as the code they describe.

## Commands

Everything runs in Docker Compose. Node on the host (version 24, see `.nvmrc`) is only for editor tooling.

```bash
cp server/.env.example server/.env && cp client/.env.example client/.env   # first time
docker compose config                      # validate compose.yaml changes before starting
docker compose up                          # client at http://localhost:5173, server at http://localhost:5000
docker compose exec server npm install <pkg>   # always install packages inside the container
docker compose up --build --renew-anon-volumes # required after adding/removing a package (node_modules is an anon volume)
docker compose exec client npm run lint        # ESLint (client only for now)
docker compose exec client npm run build
```

- Source edits need no rebuild. Bind mounts plus Vite HMR and `node --watch` reload them.
- Never run `docker compose down -v` unless you mean to delete data. From Step 3 onward it wipes MySQL.
- There is no test runner or server linter yet. Both arrive in later plan steps (Prettier and ESLint for both apps in Step 2, tests from Step 4).

## Conventions (fixed project decisions)

- **Express 5, not 4.** Async handler errors reach the error handler automatically, so don't add wrapper packages. Path syntax is stricter, so avoid bare `*` wildcards from Express 4 tutorials.
- **API paths:** business endpoints go under `/api/v1`. The health check is at `/api/health` and is not versioned.
- **Response envelopes** apply to every endpoint:
  - Success: `{ success: true, data, meta }`, where `meta` carries pagination for lists (default page size 20, max 100).
  - Error: `{ success: false, error: { code, message, details } }`, with no stack traces or SQL in production.
  - Validation failures return `400 VALIDATION_ERROR`, validated with Zod.
- **Money:** always integer pesewas. Never use floats in the backend. Format as `GHS X.XX` only in the UI.
- **Time:** store in UTC. Display and evaluate (for example, opening hours) in `Africa/Accra`.
- **Phone numbers:** store in E.164 format (`+233…`).
- **Auth tokens:** HttpOnly cookies only. Never use localStorage or sessionStorage.
- **Client env vars:** only `VITE_`-prefixed values reach React, and they are public. The API base URL is `VITE_API_URL`.
- **Database:** schema changes through migrations only. Use utf8mb4. Soft-delete with `paranoid: true` where AC-GLOBAL-06 applies. Every table has `createdAt`/`updatedAt`.
- **Roles:** `CUSTOMER`, `RESTAURANT_OWNER`, `RIDER`, `ADMIN`, `SUPER_ADMIN`, `GUEST`.
- **Formatting:** 2-space indent, LF, UTF-8, final newline (see `.editorconfig`). Use npm only and commit lock files.

## Git workflow

- Use one branch per plan step (for example, `step-02-backend-architecture`), merged to `main` after review.
- Keep commits small and conventional, and reference acceptance criteria IDs in commit messages and test names, for example `feat(auth): OTP attempt limit [AC-AUTH-09]`.
