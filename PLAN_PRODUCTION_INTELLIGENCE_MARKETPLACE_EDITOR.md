# Plan: Production Intelligence · Factory Marketplace · Enterprise Editor Platform

**Status:** planning only — no implementation assumed by this document.  
**Purpose:** align scope, sequencing, dependencies, and risks before engineering starts.

---

## Executive summary

| Initiative | Primary outcome | Depends on |
|------------|-----------------|------------|
| **Production Intelligence** | Designs and orders are **preflight-validated** and **factory-ready** before money moves | Stable `scratch_layout` schema, export pipeline, print-method rules |
| **Factory Marketplace** | Users can **compare and choose factories** (RFQ / bids / routing) | Orders, factories, pricing model, notifications |
| **Enterprise Editor Platform** | Editor is **fast, reliable, and deep** (layers, autosave, scale) | Frontend architecture, perf budget, persistence model |

**Recommended build order:**  
1) Production Intelligence (reduces rework and defines “done” for exports)  
2) Enterprise Editor Platform (in parallel once preflight contract is clear)  
3) Factory Marketplace (needs trustworthy specs + stable order lifecycle)

---

## 1) Production Intelligence

### 1.1 Goals
- Catch **print-risk issues** before payment and before factory sees the job.
- Produce a **single source of truth** spec: sides, colors, dimensions, assets, warnings.
- Reduce factory back-and-forth and failed runs.

### 1.2 In scope (MVP → v1)
- **Preflight rules engine** (server-side authoritative + client hints optional):
  - Image minimum DPI / effective print size per layer.
  - Text minimum size / stroke readability heuristics.
  - Layer bounds vs garment side bounds (already normalized; rules must match full-bleed model).
  - Color count / spot-color hints per **print profile** (DTF vs screen vs sublimation).
- **Print profiles** (user-selectable per project or per order): rule sets + labels.
- **Preflight report** object stored on project and/or order (JSON): `{ status, issues[], profile, generated_at }`.
- **Gating policy** (configurable): block “Submit production” on `error` severity; warn-only on `warning`.
- **Factory pack** (ZIP or structured JSON URLs): per-side exports + manifest + preflight report.

### 1.3 Out of scope (initially)
- True RIP / separation software in-browser.
- Legal color trademark checks.
- Automatic vector tracing of raster art.

### 1.4 Technical workstreams
- **Data model:** `print_profile`, `preflight_report`, optional `preflight_version`.
- **Services:** `PreflightService` (pure functions + tests), `ExportPackagerService`.
- **API:** `POST /projects/{id}/preflight`, `GET` latest report; optional hook on save.
- **UI:** Editor panel “Print readiness” with actionable list + deep links to layers.
- **Observability:** log preflight outcomes and failure reasons (no PII in logs).

### 1.5 Risks & mitigations
| Risk | Mitigation |
|------|------------|
| False positives frustrate users | Tunable thresholds; severity levels; “override with acknowledgement” for solo users |
| Heavy image analysis slows UI | Run preflight async on server; show progress; cache results |
| Profile rules drift from reality | Version profiles; changelog; factory feedback loop field |

### 1.6 Success metrics
- ↓ Time from order placed to factory start without clarification.
- ↑ % orders passing preflight on first run.
- ↓ Refund/cancel due to “bad file”.

---

## 2) Factory Marketplace

### 2.1 Goals
- Let a **buyer** discover and compare **multiple factories** for the same SKU intent.
- Transparent **price, MOQ, lead time, geography**, and **quality signals** (ratings, on-time rate if you add later).
- Clear **routing**: which factory owns which order after acceptance.

### 2.2 In scope (MVP → v1)
- **Factory directory** (search/filter): country, capabilities, MOQ, categories.
- **RFQ object**: buyer attaches project + line items + desired qty → factories respond with **bid**.
- **Bid comparison UI**: apples-to-apples table; select winner.
- **Order assignment**: winning factory id on order; status transitions (`assigned`, `accepted`, `declined`).
- **Notifications**: email/in-app (reuse existing patterns) on new RFQ, bid received, assignment.

### 2.3 Out of scope (initially)
- Payments split across multiple factories for one SKU (complex settlement).
- Full dispute arbitration marketplace.
- Multi-tenant legal contracts per factory (later).

### 2.4 Technical workstreams
- **Data model:** `rfqs`, `rfq_bids`, links to `orders`/`projects`, factory capability tags.
- **API:** CRUD RFQ, submit bids (factory role or impersonation if you keep roles minimal), accept bid.
- **Auth model note:** marketplace implies **at least two actor types** (buyer vs factory). That is not “team permissions”; it is **marketplace roles**. Decide explicitly: keep `factory` user type vs single user + “factory accounts” — document choice before build.
- **Integrity:** prevent bid tampering; audit who accepted what and when.
- **UI:** buyer marketplace pages + factory bid inbox.

### 2.5 Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Cold start (no factories) | Seed factories; importer; admin onboarding |
| Race conditions (two accept) | DB transaction + unique constraint on awarded bid |
| Pricing confusion | Bid line items must mirror `order_line_items` structure |

### 2.6 Success metrics
- Time to first valid bid.
- Bid coverage (# factories responding).
- Win rate and repeat factory usage.

---

## 3) Enterprise Editor Platform

### 3.1 Goals
- Editor remains **fast** with large designs.
- **Reliable persistence** (autosave, recovery, deterministic save format).
- **Depth** that competitors lack: layer system, precision tools, preview modes.

### 3.2 In scope (MVP → v1)
- **Autosave** with debounce + version increment; offline-safe queue if network drops.
- **Conflict handling** (single user still benefits: multi-tab, mobile): last-write-wins with warning banner or lease token.
- **Layer system:** lock/hide/group/multi-select; opacity/blend where meaningful.
- **Precision:** snapping, guides, numeric transforms, keyboard nudge.
- **Performance:** virtualization for layer list; memoized canvas; worker offload for heavy exports/thumbnails.
- **Editor packaging:** plugin boundaries (`editor-core`, `editor-ui`, `editor-io`) to reduce spaghetti as features grow.

### 3.3 Out of scope (initially)
- Real-time multiplayer cursors.
- Full design history branching graph (start with linear snapshots).

### 3.4 Technical workstreams
- **State:** define canonical `scratch_layout` evolution strategy (migrations + `layout_version`).
- **Transport:** idempotent save API; optimistic UI; retry backoff.
- **Testing:** interaction tests for drag/resize; property tests for layout normalization; perf budgets in CI.
- **Telemetry (optional):** anonymized timings for drag frame time (privacy-safe).

### 3.5 Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Autosave amplifies bad migrations | Feature flag; staged rollout |
| Blend modes inconsistent across browsers | Test matrix; simplify unsupported blends |
| Complexity creep | strict module boundaries + quarterly pruning |

### 3.6 Success metrics
- p95 save latency; editor interaction frame budget.
- Crash-free sessions rate.
- Time to complete a “standard” design task in usability tests.

---

## Cross-cutting dependencies (read before coding)

1. **Canonical layout contract**  
   Production Intelligence and exports must agree on coordinates, sides, and asset references. Freeze a `scratch_layout` schema version policy.

2. **Order lifecycle clarity**  
   Marketplace assignment must align with existing `shipping_status` / payment webhooks. Document state machine in one diagram before new transitions.

3. **Factory visibility rules**  
   You already hide unpaid work from factories; marketplace adds “assigned but not accepted”. Write rules explicitly to avoid leaks.

4. **Single user vs marketplace**  
   Your product can still be “one designer account” while factories are separate accounts. Call this out in UX copy and data model to avoid confusion with “team permissions”.

---

## Phased rollout (suggested)

### Phase A — Foundations (2–3 weeks)
- Layout version policy + preflight skeleton (rules + report shape).
- Autosave spike + save idempotency decision.
- Marketplace data model sketch + state machine doc.

### Phase B — Production Intelligence v1 (3–5 weeks)
- Server preflight + UI panel + gating on submit production.
- Export pack manifest.

### Phase C — Enterprise Editor v1 (parallel after Phase A, 4–8 weeks)
- Layer system upgrades + snapping + perf pass.
- Autosave + recovery + multi-tab safety.

### Phase D — Factory Marketplace v1 (4–6 weeks after Phase A)
- RFQ + bids + assignment + notifications.
- Minimal directory + factory onboarding.

### Phase E — Hardening (ongoing)
- Load tests on save/preflight; security review on bids; UX polish.

---

## Decision checklist (sign-off before build)

- [ ] Print profiles list for v1 (which 2 profiles ship first?).
- [ ] Preflight gating: block vs warn-only on first release.
- [ ] Marketplace actor model: factory accounts vs admin-managed factories.
- [ ] Assignment impact on payments (single factory payment only in v1?).
- [ ] Autosave frequency + max payload size for large data URLs.

---

## Next document (optional)

If you want execution detail next, add:
- `EXECUTION_PLAN_PRODUCTION_INTELLIGENCE.md`
- `EXECUTION_PLAN_FACTORY_MARKETPLACE.md`
- `EXECUTION_PLAN_ENTERPRISE_EDITOR.md`

Each with week-by-week tasks mapped to files/migrations/routes in this repo.
