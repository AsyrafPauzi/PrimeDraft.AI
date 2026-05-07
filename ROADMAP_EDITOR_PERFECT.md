# Editor-First Roadmap (Single User)

## Product Direction

Build PrimeDraft as an editor-led product where one user can go from idea to production-ready output in one smooth flow.

Principles:
- Quality over feature count.
- Fast interaction at all times.
- Production-safe output by default.
- Visual polish that feels premium and distinct.
- Simple model: single user (no team roles, no permission matrix).

---

## North Star (12 Months)

PrimeDraft is the fastest and most reliable single-user merch design editor for turning concepts into print-ready files.

Primary KPI:
- Draft-to-production-ready conversion rate.

Supporting KPIs:
- Time from opening editor to first valid design.
- Number of preflight issues per order.
- Export success rate.
- Average editor FPS on medium/large designs.
- Repeat weekly active designer rate.

---

## Phase 1: Core Editor Perfection (Weeks 1-4)

Goal: make editing feel effortless and trustworthy.

### 1) Canvas and Interaction Quality
- Snap lines, center guides, and edge snapping.
- Better drag/resize handles with larger hit areas.
- Optional keyboard nudge (arrow keys, shift for larger step).
- Pan/zoom smoothing and reset view shortcut.

### 2) Layer System V2
- Lock/hide layers.
- Duplicate layer.
- Group/ungroup.
- Multi-select and bulk move.
- Better z-order controls (bring to front/back).

### 3) Typography Pro Tools
- Letter spacing and line height controls.
- Text outline/stroke.
- Curved text (arc) for caps and badge styles.
- Font favorites and recently used fonts.

### 4) Background + Garment Controls
- Better garment background blend presets.
- Per-side independent background options.
- Background scale and rotation controls.
- Quick reset for garment background position.

Exit criteria:
- Editor operations feel instant on normal laptop.
- No visible jitter during drag/resize on 30+ layers.

---

## Phase 2: Print-Ready Intelligence (Weeks 5-8)

Goal: prevent costly production mistakes automatically.

### 1) Preflight Engine
- Low-resolution image detection.
- Out-of-bounds warning by side.
- Color count warning for screen print profiles.
- Tiny text readability warning.
- Thin line warning.

### 2) Print Profiles
- DTF profile.
- Silkscreen profile.
- Sublimation profile.
- User picks print method; rules update instantly.

### 3) Guided Fixes
- One-click fixes where possible:
  - auto-scale up to safe area,
  - move inside print bounds,
  - convert color mode warning suggestions.

### 4) Export Reliability
- Deterministic export pipeline per side.
- Include metadata (size, side, profile, timestamp).
- Clear export logs if anything fails.

Exit criteria:
- 90%+ designs pass preflight before submit.
- Significant drop in factory revision requests.

---

## Phase 3: Signature Differentiators (Weeks 9-12)

Goal: make PrimeDraft meaningfully different from typical web editors.

### 1) Smart Design Assist (Non-gimmick)
- Contextual suggestions:
  - improve hierarchy,
  - spacing checks,
  - contrast checks.
- Suggest alternatives while preserving style direction.

### 2) Reusable Design Systems (Single User)
- Personal brand kit:
  - saved font stacks,
  - color tokens,
  - reusable badges/elements.
- Smart template blocks reusable across projects.

### 3) Version Timeline
- Snapshot timeline with labels.
- Compare versions quickly.
- Restore safely.

### 4) High-Quality Preview Modes
- Product mock preview mode.
- Print-separation preview mode.
- Contrast stress-test view (for dark/light garments).

Exit criteria:
- Users can create a polished design from blank canvas faster than baseline.
- Timeline restore and preview modes used regularly.

---

## Engineering Backbone (Parallel Track)

### Performance
- Render budget and profiling checks.
- Memoization and selective rerendering for layer-heavy canvases.
- Large asset handling strategy (decode async, caching).

### Stability
- Autosave with crash recovery.
- Corruption-safe scratch layout migration strategy.
- Better error boundaries and user-safe recovery messages.

### Test Quality
- Interaction tests for drag/resize/select.
- Snapshot tests for layout serialization compatibility.
- End-to-end flow tests: create -> edit -> preflight -> export.

---

## Explicit Scope Decisions

Included:
- Editor-first improvements.
- Single-user optimization.
- Production safety and output quality.

Not included in this roadmap:
- Role permissions and multi-user workflows.
- Team approval hierarchies.
- Complex access controls.

---

## Milestone Review Cadence

Every 2 weeks:
- Demo the editor flow end-to-end.
- Measure KPI changes.
- Keep only features that improve speed, quality, or reliability.
- Remove or postpone anything that adds complexity without clear value.

---

## Immediate Next Build Order (Start Here)

1. Layer lock/hide/duplicate + multi-select.
2. Snap lines + keyboard nudge.
3. Preflight checks (resolution + out-of-bounds first).
4. Export metadata and stronger error handling.
5. Version timeline (basic snapshot + restore).
