<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="90" alt="Nest Logo" />
</p>

# Holarium API

NestJS 11 service that powers Holarium's authentication and user-management flows. It exposes secure local auth (email + password + bcrypt), RS256 access/refresh tokens with rotation and reuse detection, admin-scoped user management, and hardened HTTP defaults (Helmet, CORS allow-lists, throttling, login lockout, validation pipes).

## Stack

- **Runtime:** Node.js 22 / NestJS 11
- **Persistence:** PostgreSQL via TypeORM
- **Auth:** Passport (local & JWT), bcrypt hashing, RSA-signed JWTs
- **Hardening:** Helmet, rate limiting, lockout policy, configurable CORS
- **Testing:** Jest unit tests + Supertest e2e flows

## Getting Started

```bash
# Install dependencies
$ yarn install

# Copy env template and tweak values
$ cp .env.example .env

# Generate development RSA keys (ignored by git)
$ yarn generate:keys

# Start the API (expects Postgres up per DB_* env vars)
$ yarn start:dev

# or run the full stack (API + Postgres + pgAdmin)
$ docker compose up -d
```

## Environment & Secrets

`.env.example` is the canonical list. Key highlights:

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection for TypeORM |
| `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH` | Access-token RSA PEM paths (generated via `yarn generate:keys`) |
| `JWT_REFRESH_PRIVATE_KEY_PATH`, `JWT_REFRESH_PUBLIC_KEY_PATH` | Refresh-token RSA PEM paths |
| `JWT_SECRET` | HS512 fallback secret when PEMs aren't provided (dev only) |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL` | Lifetimes such as `15m`, `30d` |
| `BCRYPT_ROUNDS` | Password hashing cost |
| `AUTH_LOCKOUT_THRESHOLD`, `AUTH_LOCKOUT_DURATION_MINUTES` | Login lockout policy |
| `MAX_REFRESH_TOKENS_PER_USER` | Maximum active refresh tokens before pruning |
| `THROTTLE_TTL`, `THROTTLE_LIMIT` | Global rate-limiting defaults |
| `CORS_ALLOWED_*` | Origins/methods/headers allow-lists |

Secrets guidance:

- Dev keys: run `yarn generate:keys`. Output lives in `keys/` and is ignored by git. 
- Prod/staging: store PEMs in a secrets manager (GCP Secret Manager, Vault, KMS, etc.) and mount them into the container path. Never commit real keys.
- Rotation: `keys/README.md` documents rolling strategy (keep current + next, update envs, restart API, remove old public keys after TTL windows pass).

## Running & Testing

```bash
# Unit tests (services/helpers)
yarn test
# or docker compose run --rm holarium-api yarn test

# End-to-end flows (register → login → /auth/me → refresh)
yarn test:e2e   # requires the compose Postgres service
```

The e2e suite spins up a Nest testing module and currently targets the Postgres container defined in `docker-compose.yml`. Point `DB_*` env vars at a dedicated test schema/database before running in CI.

## API Overview

| Route | Description |
| --- | --- |
| `POST /auth/register` | Rate-limited account creation returning access + refresh tokens. |
| `POST /auth/login` | Email/password login guarded by `LocalStrategy`. |
| `POST /auth/refresh` | Refresh token rotation with family reuse detection. |
| `POST /auth/logout` | Revoke single refresh token or all tokens for the user. |
| `GET /auth/me` | JWT-protected profile endpoint. |
| `/users/*` | Admin-only user management guarded by `JwtAuthGuard + RolesGuard`. |

- Helmet, validation pipes, and CORS allow-lists are enabled globally in `main.ts`.
- Per-route throttling clamps register/login/refresh attempts, while the global guard applies to the rest of the surface area.
- Lockout policy prevents brute-force password attempts; status/lock checks run before issuing JWTs.

## Operations Notes

- **Docker Compose:** `docker compose up -d` starts Postgres (`holarium-postgres`), the API service, and pgAdmin (optional). Update `.env` to align compose ports/credentials.
- **Migrations:** `yarn build` then `yarn migration:run`. All schema changes (users, refresh tokens, locked_until column) live in `src/database/migrations`.
- **Health:** `/health` and `/health/database` endpoints exist; wire them into uptime monitors.
- **Key rotation:** use the script locally, but in production rely on your secrets system. Update envs, restart the service, and wait for old access tokens to expire before deleting legacy public keys.

## Roadmap / Contributions

- Extend e2e coverage (e.g., dockerized Postgres fixtures or Testcontainers).
- Publish OpenAPI decorators or a Postman collection for the `/auth` routes.
- Automate PEM rotation (CI job that writes to Secret Manager and triggers a deploy).

Keep `plan.md`, `.env.example`, and this README in sync when new modules or config keys are introduced. PRs welcome!
