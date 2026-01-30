# Shared Backend

SPARC Web uses the same backend as PING. There is no separate SPARC server.

## Runtime
- Backend host: `https://ping.agaii.org`
- SPARC API base: `https://ping.agaii.org/api/sparc`
- LLM endpoint: `https://game.agaii.org/llm/v1`

## Source of truth
The backend code lives in the PING repository. A copy is included here for reference only:

`SPARC_Web/ping-backend`

Do not deploy from this copy. Always deploy from `ping-agaii-org`.

## Key SPARC endpoints (served by PING)
- `POST /api/sparc/auth/login`
- `POST /api/sparc/auth/register`
- `GET /api/sparc/auth/me`
- `GET /api/sparc/games`
- `GET /api/sparc/games/{slug}`
- `POST /api/sparc/games/session/start`
- `PUT /api/sparc/games/session/{session_id}`
- `GET /api/sparc/wordgame-scores/leaderboard`

## Notes
- Accounts are unified in the PING database.
- Admins manage modules and email templates in PING (`/account`).
