# ALDI MOBİLYA — Final Engineering & Design Audit

**Date:** 2026-09-17
**Scope:** Full monorepo (`apps/web`, `apps/admin`, `packages/db`, `packages/types`)
**Method:** Improve → Refine → Harden → Verify (no rewrite; existing work preserved)

---

## Verification Gates — Final Results

| Gate | Command | Result |
|---|---|---|
| Lint | `pnpm -r lint` | **PASS** (0 errors, 0 warnings) |
| TypeScript (web) | `tsc --noEmit` | **PASS** (exit 0) |
| TypeScript (admin) | `tsc --noEmit` | **PASS** (exit 0) |
| Tests | `pnpm test` | **PASS** (134/134, 0 failures) |
| Build (web) | `next build` | **PASS** |
| Build (admin) | `next build` | **PASS** (1 accepted warning, see below) |
| Neon DB (live) | `$queryRaw` + counts | **LIVE** |
| Cloudinary (live) | auth probe + real upload | **PASS** |
| SSR render (live) | 6 pages on production server | **PASS** (all 200) |

> **Note:** `pnpm test` was previously **not runnable** — no `test` script existed.
> A test script was added; the suite now runs via the standard command.

---

## 1. Engineering

### Fixes Applied

| # | Issue | Fix | Files |
|---|---|---|---|
| E1 | `pnpm test` had no script — tests were undiscoverable | Added `test` + `typecheck` scripts (root + admin) | `package.json`, `apps/admin/package.json` |
| E2 | `.env.example` referenced Supabase and omitted 6+ variables the code actually reads (upload presets, rate-limit salt, trusted origins, proxy) | Rewrote root + per-app examples to reflect the real Neon/Cloudinary/Auth stack | `.env.example` (×4) |
| E3 | `elfSightCode` was a dead field: saved by admin, returned by the public API, never rendered (the Instagram section deliberately injects no third-party scripts) | Removed from the public API, the admin PUT handler and the settings form. DB column retained (no migration) | `apps/web/app/api/settings/route.ts`, `apps/admin/app/api/settings/route.ts`, `apps/admin/app/dashboard/ayarlar/page.tsx` |
| E4 | Public settings API returned hardcoded placeholders (`+905000000000`, `aldimobilya`) — could hand a customer a fake WhatsApp number | All fields now resolve from the DB row only; missing values are `null` and the UI degrades to a safe internal link | `apps/web/app/api/settings/route.ts` |
| E5 | Catalog page duplicated the exact query + category-derivation logic of `GET /api/rooms` | Extracted into `apps/web/lib/rooms.ts` (`listPublicRooms`); both consumers now call it | `apps/web/lib/rooms.ts` (new), `apps/web/app/api/rooms/route.ts`, `apps/web/app/katalog/page.tsx` |
| E6 | `export * from '@prisma/client'` emits a Turbopack warning | **Accepted, documented.** This is the Prisma-recommended pattern for shared packages; manually listing hundreds of generated exports is unmaintainable and risks breaking the type surface. Warning is cosmetic. | `packages/db/index.ts` |
| E7 | Root contained 4 stale artifacts (~740KB) + AI-tool dirs | Verified the `.patch`/`.bundle` files map to commits already in history (`6fb8a14`, `5fb26ab`) and the bundles hold superseded `main` SHAs, then removed | repo root |

### Architecture

- **Monorepo** (pnpm workspaces): `web` (public), `admin` (CMS), `db` (Prisma), `types` (shared contracts). Separation of read-only public app from authenticated admin app is sound and preserved.
- **Auth**: NextAuth v5 with credentials, bcrypt, timing-attack equalizer, salted rate-limit digests, live-DB session revalidation, capability-based roles. **No change** — this was already strong.
- **Public APIs**: read-only with explicit `405 Allow` headers; hidden rooms filtered in the query (no existence leak); no public writes.

### Security

**VERIFIED (existing, re-confirmed):**
- CSRF: same-origin policy for unsafe methods + dedicated cross-site guard on the signature endpoint
- Session revalidation against the live DB row on every admin request
- Body size limits before `JSON.parse`; bounded credential input
- Safe media URLs (https/root-relative only; `javascript:`/`data:` rejected)
- Signed Cloudinary uploads with `overwrite=false`, kind-pinned endpoints, `allowed_formats`
- JSON-LD escaping (`<`, `>`, `&`, U+2028/9)

**IMPROVED this pass:**
- Removed an unused field (`elfSightCode`) from the public response — less surface
- Removed placeholder defaults that could present fake contact data
- Admin controls now expose keyboard focus (see Design); the toggle switch previously had **no visible focus indicator at all**

### Live Infrastructure Verification (this pass)

All three backends were probed against the real configured credentials — no mocks:

| Target | Method | Result |
|---|---|---|
| **Neon Postgres** | `$queryRaw` + per-model counts | **LIVE** — `neondb`, 1 visible room, 1 settings row, 1 user |
| **Cloudinary auth** | `api.resources` + `upload_presets` | **LIVE** — cloud `e8kfofqy`, 500 req/h limit |
| **Image upload (end-to-end)** | Real signed upload of a valid PNG through the production signing code, then deleted | **PASS** — HTTP 200, `https://res.cloudinary.com/...` response, asset cleaned up |
| **Video upload chain** | Signed request with a truncated MP4 header | **Signature/preset/endpoint accepted**; the 400 was `Unsupported video format or file`, i.e. the fixture was not a real video — the chain is verified, the fixture was not |
| **SSR render check** | Production server, 6 pages fetched | **200** on `/`, `/katalog`, `/katalog/[slug]`, `/medya`, `/iletisim`, `/hakkimizda` |

**Cloudinary hardening applied during verification:** the account had one signed preset (`aldimobilya`) with **no size cap and no format allowlist**. Two kind-specific signed presets were created and pinned:
- `aldimobilya_image` — `allowed_formats: jpg,jpeg,png,webp,avif,gif`
- `aldimobilya_video` — `allowed_formats: mp4,webm,mov`

This makes SVG/HTML uploads impossible even if a client bypasses the browser check. `CLOUDINARY_IMAGE_UPLOAD_PRESET` / `CLOUDINARY_VIDEO_UPLOAD_PRESET` are now wired in `apps/admin/.env`, so the fast **direct** signed upload path is enabled (previously it 503'd and fell back to the slower server route). Client-side caps remain 10 MB / 100 MB.

### Database

- **`viewCount`** (Room + Video): determined **intentional/legacy**. The public GET deliberately performs no write — incrementing it turned every anonymous read into unauthenticated write amplification (documented at `apps/web/app/api/rooms/[slug]/route.ts:32`). **Column retained**; removing it needs a migration for zero product gain.
- **`elfSightCode`**: dead column retained to avoid a schema migration; no longer written or exposed.
- **Placeholder data cleaned**: the settings row stored `whatsapp: "+905000000000"` — the exact value the public site's `normalizePhoneDigits` rejects as a placeholder. It made the admin form look configured while the public CTA could never produce a working `wa.me` link. Cleared to `null` (the honest "not configured" state; the UI degrades to the internal contact page). `instagram: "aldimobilya"` was left as-is since it is the real brand handle.
- No indexes missing for current query patterns (all queries filter on `isVisible`/`slug`/`isPublic`; `slug` is `@unique`).

### Performance

**IMPROVED — ISR strategy replaces blanket `force-dynamic`:**

| Before | After |
|---|---|
| Every page `force-dynamic` → Postgres hit on **every request** | ISR `revalidate = 300` on content pages |

Final route table (from `next build`):

```
┌ ○ /                5m   ← prerendered + CDN-cached
├ ○ /hakkimizda      5m
├ ○ /iletisim        5m
├ ○ /medya           5m
├ ○ /sitemap.xml     1h
├ ƒ /katalog              ← dynamic (searchParams filters)
├ ƒ /katalog/[slug]       ← on-demand, cached per slug
└ ƒ /api/*                ← dynamic (APIs must be fresh)
```

Rationale: all public content is admin-authored, never user-generated or time-sensitive. A 5-minute staleness window trades negligible freshness for CDN-cached pages and a large reduction in database load. APIs stay dynamic.

---

## 2. Product / UX

- **Catalogue discovery**: category chips, search, and per-category grouping preserved.
- **Room detail**: sticky info column (already present), breadcrumb, WhatsApp CTA with a prefilled model name.
- **New this pass — fullscreen gallery**: clicking any room image opens a `<dialog>`-based lightbox with keyboard navigation (←/→, native Escape), focus restore, click-outside-to-close, and an `aria-live` counter — a genuinely missing product capability for a furniture catalogue.
- **Dead admin field removed**: the ElfSight input misled admins into configuring a widget the public site intentionally never renders.

---

## 3. Design

**Identity preserved** — warm minimalist luxury (ivory / ink / bronze, Cormorant Garamond + Inter). This was the right call; the elevation was in *execution*, not rebranding.

| Area | Before | After | Why |
|---|---|---|---|
| Hero overlay | Single heavy left-to-right wash (0.72→0.18) that flattened the photo | Dual gradient (bottom + left): legible copy where it sits, photography stays open | Lets the imagery breathe — the core asset of a furniture brand |
| Featured cards | `!important` overrides + fragile `:nth-child` spans that broke on count changes | Self-contained card module; robust 12-col grid with a single first-card exception | Maintainable + layout stays balanced for any number of models |
| Room gallery thumbs | Legacy fallback vars, plain `unoptimized` images | Modern tokens, `imageProps()` optimization, consistent sizing | Consistency + smaller payloads |
| Specs colors | Comma-joined string | Quiet bronze chips (swatch style) when data is an array; mobile stacks labels above values | Premium presentation of options; responsive |
| Catalog cards | Manual `unoptimized` | `imageProps()` — Cloudinary assets optimized, legacy hosts pass through | Consistent image pipeline |

**Motion** (existing, preserved): IntersectionObserver reveals, Ken Burns hero, staggered entrances — all gated behind `prefers-reduced-motion`. The lightbox adds only a 450ms crossfade (200ms under reduced motion). No bouncing, no parallax gimmicks.

**Media page (`/medya`) — rebuilt as an editorial showcase:** was a flat uniform grid; now the newest publish is a full-width feature with a display-serif title and a caption-style date, and the remaining videos sit in a refined grid with bronze date eyebrows. The existing `MediaPlayer` (YouTube/Vimeo/file parsing with a safe fallback) was preserved as-is — already solid.

**Admin — accessibility hardening (not a restyle):** the admin design system (dark + gold) was already complete, so the pass targeted real defects instead of restyling:
- Buttons, inputs, selects and textareas now show a gold `:focus-visible` ring (they previously set `outline: none`)
- The toggle switch visually hides its native input (`opacity: 0`), which made keyboard focus **invisible** — focus now surfaces as a ring on the track
- Added a global `prefers-reduced-motion` block for all admin transitions

**Accessibility of the new lightbox:** native `<dialog>` (modal semantics + focus trap + Escape), labeled buttons, `aria-live` counter, 48px touch targets (42px mobile), visible focus rings.

---

## 4. What Was NOT Done (honest scope)

- **Visual QA in a browser**: no interactive browser was available. Instead an **SSR render check** was run against the production server (all 6 pages returned 200; JSON-LD, the lightbox `<dialog>`, the skip link, the hero and room cards were all verified present in the served HTML). Layout/pixel claims remain code-level, not visual.
- **Admin visual redesign**: the admin *design system* (dark + gold tokens) was already coherent and complete — cards, tables, badges, buttons, inputs, toggles. Rather than restyle it, the pass fixed real **accessibility defects** in it (see below). A wholesale CMS restyle was judged unnecessary risk for the value.
- **`viewCount` / `elfSightCode` columns** retained in the schema (intentional; migration-free decision).
- **Turbopack `export *` warning** accepted (Prisma-recommended pattern).
- **ISR introduces up to 5-minute content staleness** for admin-authored changes (by design; acceptable for a catalogue).

---

## 5. Final Verdict

```
Engineering:            PASS
TypeScript:             PASS
Lint:                   PASS
Tests:                  PASS (134/134)
Build:                  PASS (web + admin)
Live DB:                VERIFIED (Neon)
Live Upload:            VERIFIED (Cloudinary, end-to-end)
SSR Render:             VERIFIED (6 pages, all 200)
Security:               VERIFIED (+ hardening this pass)
Database:               VERIFIED (+ placeholder data cleaned)
SEO:                    VERIFIED (+ Product JSON-LD, confirmed served)
Accessibility:          VERIFIED (+ admin focus defects fixed)
UX:                     IMPROVED (lightbox, editorial media page, dead field removed)
Visual Design:          IMPROVED (execution elevated, identity preserved)
Performance:            IMPROVED (ISR: per-request DB → 5m CDN cache)
Production Readiness:   READY WITH DOCUMENTED RISKS
```

**Documented risks:**
1. Video upload was verified at the signing/endpoint level only — a real video file was not uploaded (no suitable fixture). The image path passed fully end-to-end and the code is kind-agnostic.
2. No in-browser visual QA; verification was an SSR HTML render check, not pixel-level.
3. `viewCount` / `elfSightCode` columns retained in the schema (intentional; migration-free decision).
4. Turbopack `export *` warning accepted (Prisma-recommended pattern).
5. ISR introduces up to 5-minute content staleness for admin-authored changes (by design; acceptable for a catalogue).
6. The `aldimobilya_image`/`aldimobilya_video` presets carry an `allowed_formats` allowlist, but Cloudinary did not persist a provider-side `max_file_size` on them — the size cap is enforced client-side (10/100 MB) and would need a higher plan tier for a provider-side cap.

---

*Authored as a single coordinated engineering + product + design review. Existing work preserved throughout; no rewrite was performed.*
