# FinZ LMS Super Admin Portal — Backend Integration Report

**Scope:** All 57 screens across 14 phases, integrated against the FinZ LMS API (170 endpoints, merged from your two Swagger exports).

**Build status:** `npm run build` passes clean on every checkpoint. One pre-existing case-sensitivity bug (`Searchbar.css` import) was fixed because it broke every Linux/CI build — unrelated to the API work.

---

## How to use this package

1. Unzip, `cd` into the folder, `npm install`, `npm run dev`.
2. The axios instance (`src/services/api.js`) already points at `https://pw-backend-2cwh.onrender.com/api/v1` and reads the Bearer token from `localStorage.access_token` (your existing auth flow — untouched).
3. New service-layer files are under `src/services/` — one per module, each documents its own gaps in code comments.

---

## Architecture added

| File | Purpose |
|---|---|
| `src/hooks/useNotification.js` | Shared toast state hook wrapping the existing `<Notification>` |
| `src/components/common/Pagination.jsx` | New — no pagination UI existed before |
| `src/components/common/NoBackendBanner.jsx` | New — consistent "not wired" banner for pages with zero backend support |
| `src/services/usersService.js` | Users, Roles, Permissions, Sessions (19 endpoints) |
| `src/services/profileService.js` | Profile, Notifications, Search, Dashboard, System Health (20 endpoints) |
| `src/services/merchantsService.js` | Merchants, Verification Logs, Merchant Categories (18 endpoints) |
| `src/services/productsService.js` | Products, Categories, Brands (10 endpoints) |
| `src/services/lendersService.js` | Lenders, Lender Rules, Waterfalls, SLA (16 endpoints) |
| `src/services/pricingService.js` | EMI Types, Tenure Slabs, Offers (15 endpoints) |
| `src/services/storesService.js` | Stores (4 endpoints) |
| `src/services/supportService.js` | Tickets (8 endpoints) |
| `src/services/complianceService.js` | Reports, System-parameter audit, Documents (18 endpoints) |
| `src/services/systemService.js` | Feature Flags, Workflows, Integrations, System Parameters (24 endpoints) |
| `src/services/analyticsService.js` | Business/Lender/Sales analytics (9 endpoints) |
| `src/services/templatesService.js` | Notification Templates, Communication Logs (15 endpoints) |

All services export a shared `normalizeListResponse()` helper (in `usersService.js`) that tolerates three response shapes — bare array, Laravel paginator (`{data, current_page, last_page, total}`), or keyed object — since **no list endpoint in the spec documents its response schema**, only request bodies. This was the single biggest source of guesswork across the whole integration.

---

## Module-by-module status

### ✅ Phase 1 — Auth & Profile (Screens 01–05)
Login/MFA/Forgot-Password were already correctly wired by you — verified against the spec, untouched. **Profile & Notification Center** newly wired to `GET/PUT /admin/profile` and the 8 notification endpoints. Fixed `App.jsx`'s `AppLayout` to read the real logged-in user from `localStorage` instead of a hardcoded `"Super Admin"` stub, and made `logout()` call `POST /auth/logout`.

**Gaps:** No self-service password-change endpoint (only admin-on-other-user). No per-admin MFA reconfigure/recovery-codes endpoint (only a global toggle). No timezone/theme/notification-channel-preference fields on the backend.

### ✅ Phase 2 — Command Center (Screens 06–08)
Master Dashboard wired to 3 endpoints (`dashboard`, `action-tray`, `live-stream`) with 30s polling on the live stream. System Health wired to all 6 system-health endpoints including maintenance-mode toggle. Global Search wired to live search + recent + save/pin, with a working ⌘K palette.

**Gaps:** None of these three endpoints document response shape — all KPI fields are best-guess mappings, degrading to "—" rather than fake numbers when a field isn't found.

### ✅ Phase 3 — User & Access Management (Screens 09–13)
Fully wired: User Directory (search/filter/pagination/bulk actions/export/impersonate/disable/MFA/reset), Create/Edit User, Role Management, Permission Matrix, Session Management.

**Gaps:** `PUT /admin/users/{id}` only accepts `name` — merchant scope, store assignment, MFA-on-create, password expiry, and activation windows are UI-only and clearly marked disabled. Permission Matrix assumes a flat `permissions: string[]` contract (e.g. `"view_users"`) since the matrix response shape isn't documented — flagged as the single most uncertain mapping in the whole project. No bulk "revoke all suspicious sessions" endpoint — implemented as parallel individual revokes.

### ✅ Phase 4 — Merchant Lifecycle (Screens 14–19)
All 6 pages wired. Fixed two pre-existing routing bugs: `MerchantDirectory` linked to `/merchants/:id` (route doesn't exist) → corrected to `/merchants/profile/:id`; `window.location.href` full-reloads replaced with `react-router` navigation.

**Gaps:** KYC Review Workspace and Verification API Logs had no merchant context in their routes at all (`/merchants/kyc` and the logs page took no id) — added a merchant picker backed by the real merchant-queue endpoints so they're actually usable. Agreement Management is the largest gap: the backend exposes **only** `POST .../agreement` (generate) — no list, preview, eSign-send, or versioning endpoint exists, so that page is rebuilt around "pick a merchant → generate" with the missing pieces explicitly listed in the UI.

### ✅ Phase 5 — Store & Product Oversight (Screens 20–23)
All 4 pages wired to real endpoints.

**Gaps:** No duplicate-SKU-detection endpoint. Bulk financing-eligibility toggle is scoped server-side to one category at a time, not arbitrary SKU selection. No store-level inventory-snapshot or loan-application endpoint (flagged inline on Store Detail).

### ✅ Phase 6 — Lender Operations (Screens 24–28)
All 5 pages wired, including a real find: `GET /admin/lender-sla/metrics` — I missed this in my first scan of the spec and initially shipped the SLA Monitor page with a "no backend" banner; corrected once found.

**Gaps:** Lender create/update only accepts `{name, api_base_url, status}` — credentials, webhook URL, supported categories, loan-amount range, and commission fields are collected in the UI but explicitly marked as not persisted.

### ✅ Phase 7 — Pricing & Offers (Screens 29–32)
All 4 pages wired to EMI Types, Tenure Slabs (with CSV import/export), and Offers (create/approve/reject).

**Gaps:** EMI Type schema has no enabled/disabled field (status is inferred from `effective_from` date). Offer schema has no coupon-code field and no "festival template" endpoint — removed from the form rather than left as dead inputs.

### ⚠️ Phase 8 — Loan & Disbursal Management (Screens 33–37)
**No backend support exists at all.** I searched the full 170-endpoint spec and every tag list twice (once independently, once cross-checked against your PRD's Appendix E) — there is no `/loans`, `/settlements`, or `/collections` endpoint anywhere, despite the PRD listing them as planned (`/api/admin/loans/*` etc. in Appendix E are *suggested*, not implemented). All 5 pages now show a clear in-UI banner stating this; original mock UI is otherwise untouched and still browsable.

### ⚠️ Phase 9 — Risk & Fraud (Screens 38–41)
**No backend support exists at all** — same situation as Loans, confirmed against both the spec and the PRD's suggested-but-unbuilt `/blacklist`, `/risk-rules`, `/fraud-alerts` endpoints. All 4 pages flagged with the same banner pattern.

### ✅ Phase 10 — Compliance & Audit (Screens 42–44)
Compliance Reports & Exports fully wired to the real custom-report-builder endpoints (`run`/`save`/`export`/`schedule`). Audit Trail Explorer wired to the one real audit endpoint available (`GET /admin/system/parameters/audit`) with a clear scope caveat — it only covers parameter changes, not the general cross-system log the original mockup implied. Consent Log Viewer has zero backend support (no consent endpoint exists anywhere) and is flagged.

### ✅ Phase 11 — Analytics & BI (Screens 45–48)
All 4 pages wired: Business Analytics, Lender & Loan Analytics, Sales & Region Analytics, Custom Report Builder (field picker sourced from the live schema endpoint with a sane fallback if that call fails).

### ✅ Phase 12 — Notifications & Documents (Screens 49–51)
All 3 pages fully wired — Template Manager (create/edit/activate/archive/test-send), Communication Logs (filter/resend/summary), Document Repository (list/stats/share/delete).

**Gap:** No document-upload endpoint (documents arrive via merchant/customer-facing flows, not this admin screen).

### ✅ Phase 13 — System & Integrations (Screens 52–55)
All 4 pages wired — Feature Flags (toggle/kill-switch/A-B test), Workflow Builder (list/create/publish/archive against the real `canvas` JSON field), Third-Party Integrations (health-check/toggle/configure), System Parameters (grouped settings + maintenance-mode toggle).

**Gaps:** No "Debug Logging" toggle or "Reset to Defaults" endpoint. Workflow Builder creates/edits the real `canvas` JSON contract but doesn't include a full drag-and-drop graph editor (out of scope for this pass).

### ✅ Phase 14 — Support & Helpdesk (Screens 56–57)
Both pages wired. Fixed the same routing gap as the KYC page — `/ticket-detail-sla-tracking` had no `:id` param — added a ticket picker.

**Gap:** No ticket-creation endpoint for admins (tickets arrive from other portals) — "+ Create Ticket" is disabled with an explanation.

---

## Summary of backend gaps to hand to your backend team

1. **Loans module (Screens 33–37)** — entirely unbuilt. Biggest gap by far.
2. **Risk & Fraud module (Screens 38–41)** — entirely unbuilt.
3. **Consent Log Viewer (Screen 43)** — entirely unbuilt.
4. **General audit trail** — only a narrow system-parameter audit log exists; nothing captures loan approvals, role changes, manual overrides, etc.
5. **Merchant Agreement Management** — only "generate" exists; no list/preview/eSign/versioning.
6. Several update endpoints accept far fewer fields than their corresponding UI forms (users, lenders, EMI types) — listed per-module above.
7. No general document/photo upload endpoint anywhere in the admin API.
8. List-endpoint response shapes are undocumented across the board — recommend adding response schemas to the OpenAPI spec so future integration work doesn't require guesswork.

---

## Testing note

The backend is on Render's free tier, which sleeps after inactivity — the first request after idle can take 30–60s. If pages show loading spinners that never resolve on first load, that's likely cold-start, not a bug; retry after ~60s.
