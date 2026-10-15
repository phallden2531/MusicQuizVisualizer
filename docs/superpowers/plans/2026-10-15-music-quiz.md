# Music Quiz Implementation Plan

> For agentic workers: use superpowers:executing-plans for inline implementation and one final independent review.

**Goal:** Deliver the approved live colleague music quiz, ready for local use and Azure deployment.

**Architecture:** React client with separate host, screen, and player views. A single Node process serializes authoritative game mutations and persists JSON/media through local and Azure Blob storage adapters. Socket.IO distributes role-specific snapshots.

**Tech stack:** TypeScript, React, Vite, Express, Socket.IO, Zod, Azure Storage SDK, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-15-music-quiz-design.md`

## Global constraints

- At most 15 players, one active game and one presentation screen.
- Actual audio end plus 15 seconds closes answers; host initiates a five-second photo reveal.
- Correctness, scores for the current round, and photos remain private before their reveal phases.
- One locked guess; server scoring ranges from 1,000 to 500; persisted before acknowledgment.
- Azure-only deployment with managed identity and private storage.

## Review focus

- Late/duplicate guesses, malicious role claims, or guessed media identifiers must not bypass game rules.
- Audio interruption, stale playback events, and reconnects must preserve round timing.
- A failed persistence write must not acknowledge or publish a mutation.
- Restart must retain players/answers and pause interrupted games.
- Mobile clients and 15 simultaneous players must work through a complete game.

### Task 1: Domain and storage

- [x] Write failing Vitest tests for scoring, phases, pause/resume, recovery, and safe projections.
- [x] Implement `shared/types.ts`, `server/game.ts`, and `server/storage.ts`; run domain tests.
- [x] Use a pure reducer plus a serialized service; local atomic writes and Azure conditional writes.

### Task 2: HTTP and live transport

- [x] Write failing integration tests for host login, uploads/editor, join, protected media, commands, persistence failures, and 15 players.
- [x] Implement `server/app.ts`, `server/service.ts`, `server/auth.ts`, `server/index.ts`; run tests.
- [x] Enforce authentication, request validation, private state, single presentation ownership, and server deadlines.

### Task 3: Game show interface

- [x] Add browser acceptance scenarios for host setup, lobby joining, audio enablement, one locked answer, deadline, reveal, leaderboard, and reconnect.
- [x] Implement React views, shared connection hook, responsive styling, QR codes, uploads, editing, playback and recovery.
- [x] Run browser checks on desktop and mobile; inspect screenshots and fix observed defects.

### Task 4: Azure and final verification

- [x] Add Bicep infrastructure, deployment packaging, environment example, README, and CI.
- [x] Run typecheck, production build, unit/integration/browser tests, and infrastructure validation if Azure tooling is present.
- [x] Perform independent final review and address important findings; record verified limitations.
