# E2E Tests

Browser-based end-to-end tests using [Playwright](https://playwright.dev/).

## Prerequisites

The dev server runs automatically when you run tests (via `webServer` in config).
Or start it manually: `pnpm dev` → `http://localhost:5173`

**Test user credentials:** `test@test.com` / `test123456`

## Commands

| Command | Description |
|---|---|
| `pnpm test:e2e` | Run all tests headlessly |
| `pnpm test:e2e:ui` | Open Playwright interactive UI mode |
| `pnpm test:e2e:report` | View HTML test report |

## Test files

| File | What it tests | Key inputs | Expected outputs |
|---|---|---|---|
| `auth.spec.ts` | Login modal, protected route redirects, wrong credentials | `test@test.com / test123456`, wrong passwords | Redirect to `/dashboard`, modal opens, error banner on wrong creds |
| `dashboard.spec.ts` | Dashboard loads, rank cards, 404 page, mobile nav | Route navigation | Page renders, rank tier names visible |
| `wallet.spec.ts` | All 4 modals (Deposit, Submit Tx, Transfer, Withdraw), txHash validation | Valid hash: `0x` + 64 hex chars, invalid hashes | Modals open/close, submit button enabled/disabled, validation errors |

## txHash Test Cases

| Input | Expected |
|---|---|
| *(empty)* | Submit button disabled |
| `not-a-valid-hash` | Validation error on blur, button disabled |
| `0xabc123` (too short) | Validation error on blur, button disabled |
| `0x` + 64 × `a` (valid) | Button enabled, no validation error |

## Projects

Tests run in two browser profiles:
- **chromium** — Desktop Chrome (1280×720)
- **Mobile Chrome** — Pixel 5 (393×851)
