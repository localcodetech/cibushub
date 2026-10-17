# Dependency audit

`npm audit` checks every package against known security advisories. Run it in both apps before each release:

```bash
docker compose exec server npm audit
docker compose exec client npm audit
```

Never run `npm audit fix --force` blindly: it "fixes" by installing very old or very new major versions (here it offered Sequelize 3 and shadcn 1), which breaks the app.

## 2026-10-17

| App | Package | Severity | What we did |
| --- | --- | --- | --- |
| server | `uuid` < 11.1.1 (inside Sequelize) | moderate | **Fixed.** `overrides` in `server/package.json` forces `uuid@^11.1.1`. Sequelize only calls `uuid.v1()` / `uuid.v4()`, which work the same. Checked with the auth, order and address tests. Remove the override once Sequelize ships a fixed `uuid` itself |
| client | `source-map-js` 1.2.1 | high | **Fixed** with `npm audit fix` (a patch update) |
| client | `braces` (via `micromatch` → `fast-glob` → the `shadcn` package) | high | **Accepted, not exploitable.** No fixed version of `braces` exists yet. It's only used by the shadcn command-line tool and at build time, on file patterns we write ourselves. None of it reaches the browser, and no visitor can send it a pattern. The app needs `shadcn` only for `@import "shadcn/tailwind.css"`. Check again at the next audit |

Result: server **0** vulnerabilities; client **7**, all from the accepted `braces` chain.
