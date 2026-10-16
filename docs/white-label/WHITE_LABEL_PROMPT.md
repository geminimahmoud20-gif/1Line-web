# White-label prompt: real-estate brokerage site + CRM (based on 1Line)

## إزاي تستخدم الملف ده (بالعربي)

1. **اعمل نسخة جديدة من الريبو** لكل عميل (GitHub ← Use this template، أو `git clone` في ريبو جديد). متشتغلش على ريبو 1Line نفسه.
2. **املا "Brand sheet"** (القسم 2 تحت) ببيانات العميل الجديد: الاسم، اللوجو، الألوان، التليفون، المناطق، والحسابات.
3. **افتح جلسة Claude Code على الريبو الجديد**، والصق الملف ده كله ومعاه الـ Brand sheet متملي، وقوله: "نفّذ المرحلة 1". نفّذ مرحلة مرحلة، وراجع كل PR قبل ما تدمجه.
4. **الحاجات اللي محتاجة حساباتك أنت** (Firebase جديد، Vercel جديد، الدومين، المفاتيح) مكتوبة في القسم 6. الذكاء الاصطناعي مش هيعملها ولا هيطلب منك تلصق المفاتيح السرية في الشات.

> البرومبت بالإنجليزي علشان أي أداة ذكاء اصطناعي تفهمه بدقة. نصوص الموقع نفسها هتفضل بالعربي المصري زي 1Line.

---

## 0. Role and goal (for the AI)

You are working on a **fresh copy** of the 1Line codebase: a bilingual (Arabic-first, RTL) real-estate brokerage website with a full staff CRM. Your job is to **rebrand it for a new client** so the result looks and behaves exactly like 1Line: same layout, components, motion, CRM, data model and security. Only the identity and the client-specific data change.

Rules for the whole job:
- **Keep the design system.** Do not redesign, restyle or "improve" layouts. Change colors only through the tokens listed in §4, and fonts only if the Brand sheet asks.
- **Never copy 1Line's data into the new client's site.** That covers listings, leads, phone numbers, the founder's name and photo, Microsoft Clarity ID, Firebase project and admin UID.
- **Never ask for or accept secrets in chat** (service-account JSON, Blob token, reCAPTCHA secret, backup passphrase). The owner sets them in Vercel / GitHub settings (§6).
- **Never run scripts against, or deploy to, the production Firebase project without the owner's explicit approval** in the conversation.
- Work in **small PRs, one phase each**. Run `npm run lint`, `npm test` and `npm run build` before every push. Commit subjects must say what changed (`scripts/check-commit-message.mjs` rejects vague ones like "update").
- **Arabic UI copy is Egyptian Arabic.** Keep it short and plain, and use Latin digits (the site already forces them via `utils/latinDigits.js`).
- When something in the code doesn't match this document, trust the code, and say so in the PR.

---

## 1. What the system is

### 1.1 Stack
| Layer | Technology | Notes |
|---|---|---|
| Front end | React 19 + Vite 8, React Router 7, `lucide-react` icons, `motion` | Single-page app; the CRM is lazy-loaded (`CrmPage` chunk). |
| Hosting | Vercel (static build + serverless functions in `api/`) | `vercel.json` holds rewrites, security headers and a report-only CSP. |
| Database / auth | Firebase **Spark (free)**: Firestore + Firebase Auth | Rules in `firestore.rules`, indexes in `firestore.indexes.json`. **No Cloud Functions, no TTL** on Spark. |
| Server work | Vercel functions in `api/` | `notify` (WhatsApp alerts), `track` (analytics), `catalog` (public listings JSON), `seller-upload` / `cms-upload` (photos), `team` (staff), `fx` (currency rates). Shared logic lives in `api/_*-core.js` (pure, unit-tested). |
| Files | Vercel Blob | Seller photos and CMS media. Never base64 inside Firestore (1 MiB doc limit). |
| Scheduled jobs | GitHub Actions | `backup.yml` (encrypted nightly Firestore backup), `analytics-cleanup.yml` (deletes expired analytics; dry run until enabled), `firebase-deploy.yml` (rules/indexes, manual), `ci.yml`. |
| Font | **Cairo only** | A test fails if any other family is named (`tests/unit/design-tokens.test.mjs`). |

### 1.2 Repository map
```
api/                 Vercel functions (+ _*-core.js pure logic)
src/
  config/siteConfig.js   ← brand facts: name, contact, areas, stats, legal IDs
  firebase.js            ← Firebase web config (project-specific)
  translations.js        ← UI strings (ar/en)
  index.css              ← global tokens (navy/gold/sand palette, fonts)
  styles/tokens.css      ← CRM design-system tokens (--ui-*)
  styles/*.css           ← art-direction, luxury-system, home-luxe, mobile-polish …
  components/
    common/              Header, Footer, ConsentBanner, InstallAppButton, modals
    home/ properties/ portals/ family/ commercial/ …   public site
    crm/                 the whole CRM (CrmPage, LeadsTab, Kanban, drawers, panels)
    ui/                  CRM design-system components (Button, Card, KpiTile, …)
  context/PropertiesContext.jsx   data layer for listings + leads
  services/              leads.js (offline queue), SLA, state machine
  utils/                 pure helpers (areasData, rbacRules, commission, analytics, …)
  pages/                 one file per route
public/                  logo, icons, manifest.json, sw.js, og-image, founder photo, videos
scripts/                 backup/restore, migrations, admin claim, SEO post-build, audits
tests/unit|integration|rules   node:test suites (+ Firestore rules tests on the emulator)
docs/                    audits, runbooks, this file
```

### 1.3 Public site (routes in `src/AppRoutes.jsx`)
`/` home (hero + smart search + featured listings + buyer demands + family-home section) · `/properties` (filters, grid/map, compare, favorites) · `/properties/:id` (gallery, specs, financial breakdown, legal status, financing calc, similar units, sticky call/WhatsApp/reserve bar) · `/projects` · `/demands` (buyer requests) · `/sell` (4-step seller wizard with 8 labeled photo slots → Blob) · `/valuation` · `/buy` · `/financing` · `/investor` · `/broker` · `/referral` · `/trade-in` · `/commercial-hub` · `/private-office` · `/special-requests` · `/market-intelligence` · `/my-account` (client account) · `/favorites` · `/compare` · `/about` · `/privacy`.

Cross-cutting: consent banner (Clarity only after consent; never on `/crm` or `/my-account`, see `utils/privatePaths.js`), quick search (Ctrl+K), PWA install button, offline lead queue, currency switcher (EGP + indicative foreign currencies), Arabic plural agreement (`utils/arabicCount.js`).

### 1.4 CRM (`/crm`, staff only)
Sidebar sections (see `components/crm/CrmSidebar.jsx`):
- **Inbox:** smart inbox by request kind.
- **Dashboard:** KPIs, including expected commission (`utils/commission.js`).
- **Leads:** table, row menu, filters (incl. "صفقات ناجحة"), lead drawer with commission box, call log, stages, notes.
- **Kanban.**
- **Matching:** buyer ↔ listing.
- **Agents:** leaderboard.
- **Retargeting**, **Expat intake**, **Trade-ins**.
- **Properties:** review queue, bulk actions, filters, reports.
- **Demands**, **Projects**, **Ads**.
- **Financials:** invoices.
- **Visitor intelligence:** analytics.
- **System:** areas, team and roles, site settings, founder CMS, homepage slots, backup, client errors, UI kit.

### 1.5 Roles and security
- **Admin:** a custom claim `admin: true` or `role in ['admin','super_admin']` (`firestore.rules`). Set the first admin with `scripts/ensure-admin-claim.mjs` (needs `ADMIN_UID` + service account; run by the owner).
- **Other roles:** `sales_manager`, `sales_agent`, `property_manager`, `finance`, `viewer`, plus desk brokers (`agent_*`). Labels live in `components/crm/crmRoles.js`; desks must match `DESK_BY_ROLE` in `utils/rbacRules.js` **and** `leadDesk()` in `firestore.rules`.
- **Phones never sit on public or lead docs.** They go in `lead_contacts` / `person_contacts` / `request_contacts`, readable only by permitted roles.
- **Owner phones and names never go in public `properties` docs.**
- **Analytics** store no names, phones or free text. Visitor profiles are kept only with consent (Egypt PDPL 151/2020).
- **WhatsApp staff alerts** show only the last 3 digits of a customer's phone.
- **Rate limits:** `api/_rate-limit.js` (per IP + overall flood guard).

### 1.6 Firestore collections (see `firestore.rules`)
`properties, projects, developers, demands, public_demands, leads, lead_contacts, persons, person_contacts, deals, tasks, notifications, notify_log, search_requests, request_contacts, remote_inspections, trade_ins, referrals, nominations, complaints, commission_invoices, advertisements, ad_stats, ad_stat_shards, analytics_daily, analytics_properties, analytics_sessions, analytics_visitors/{id}/batches, audit_logs, client_errors, client_downloads, settings, staff_registry, session_revocations, collections`.

### 1.7 Quality gates
- `npm run lint`: zero warnings. Includes a ratchet on CRM hex colors, inline styles and `!important`.
- `npm test`: unit + integration.
- `npm run test:rules`: Firestore rules on the emulator.
- CI jobs: `test`, `rules`, `journey` (form → emulator → CRM), `commits`.

---

## 2. Brand sheet (fill this in for the new client)

```yaml
client:
  name_ar:            ""        # e.g. "النخبة للتسويق العقاري"
  name_en:            ""
  legal_name:         ""
  tagline_ar:         ""
  tagline_en:         ""
  founder_ar:         ""        # or leave empty to hide the founder section
  founder_en:         ""
  founder_photo:      ""        # path to a real photo file, or none
  years_active:       null      # only documented numbers; null hides the tile
contact:
  phone_e164:         ""        # +20…  (used for call + WhatsApp buttons)
  whatsapp_e164:      ""
  email:              ""
  address_ar:         ""
  address_en:         ""
  hours_ar:           ""
  maps_query:         ""
  geo:                { lat: 0, lng: 0 }
legal:
  commercial_registry: null
  tax_card:            null
domain:
  site_url:           ""        # https://… (after the domain is connected)
coverage:              # cities → sectors → districts used by filters, matching and pricing
  - city_ar: ""
    city_en: ""
    sectors:
      - name_ar: ""
        districts_ar: ["", ""]
identity:
  logo_svg_or_png:    ""        # square emblem, transparent background, ≥ 512 px
  wordmark:           ""        # how the name is drawn in the header (text or image)
  colors:
    primary_dark:     "#0B1B32" # 1Line navy-900 (header, hero, buttons)
    primary_darkest:  "#07111F" # navy-950
    primary_mid:      "#142B49" # navy-800
    accent:           "#B38A45" # 1Line gold
    accent_dark:      "#806329"
    accent_soft:      "#F3EBDD"
    background:       "#F7F5F0" # sand / ivory
  font:               "Cairo"   # keep unless the client insists
services_ar:          []        # which public portals to keep (see §5.6)
integrations:
  clarity_project_id: ""        # new Microsoft Clarity project, or empty to disable
  firebase_project_id: ""       # NEW Firebase project created by the owner
  firebase_web_config: {}       # apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId (public, safe to commit)
  admin_uid:          ""        # the owner's Firebase Auth uid, after first sign-in
crm_roles:            # keep the defaults or rename desks to the client's teams
  desks: [ { id: "agent_east", label_ar: "" } ]
commission:
  default_pct:        2.5
```

---

## 3. Phase plan (one PR per phase)

### Phase 1: Centralise the brand (no visible change)
Today the brand is **hard-coded in many files**. On the 1Line codebase: "1Line" ≈ 470 hits in 120 files, "سوهاج" ≈ 420 hits in 108 files, `oneline_` storage keys ≈ 155 hits in 54 files. Before any rename, move identity into config so the next client is a config change, not a search-and-replace.

1. Extend `src/config/siteConfig.js` with everything in the Brand sheet. Add `BRAND.storagePrefix`, `BRAND.wordmark`, `CONTACT.phone`, `CONTACT.whatsapp`, `INTEGRATIONS.clarityId` and `FIREBASE` (web config). Read secrets-free values from `import.meta.env.VITE_*` with the 1Line values as defaults.
2. Replace literals with imports from `siteConfig`:
   - Header/Footer wordmark ("1" + "LINE"), `LogoEmblem`, page titles and SEO (`utils/seoHelper.js`, `index.html` meta, JSON-LD), share texts (`ShareModal`), PDF brochure and compare PDF footers, contract studio, WhatsApp message templates, calendar invites (`utils/calendarSync.js`), the CRM sidebar title, and the founder CMS defaults (`utils/founderCmsData.js`).
   - Phone/WhatsApp in `Footer`, `QuickContactDrawer`, `index.html`, `crmNoteSanitizer.js`, `founderCmsData.js`.
   - Clarity ID in `ConsentBanner.jsx`.
   - Firebase config in `src/firebase.js`.
   - Project id in `api/{catalog,track,team,cms-upload}.js` and `scripts/{postbuild-seo,deploy-firestore,backup-format,backup-firestore}.mjs`. Prefer `process.env.FIREBASE_PROJECT_ID` with a default.
   - The fallback site URL `1-line-qkzp9.vercel.app` in `siteConfig.js`, `api/notify.js`, `DemandsPortal.jsx`, `postbuild-seo.mjs`.
3. **localStorage keys:** replace the `oneline_` prefix with `${BRAND.storagePrefix}_` through one helper in `utils/browserStorage.js`. Keep a one-time read of the old keys so existing 1Line visitors don't lose favorites.
4. Service-worker cache name in `public/sw.js`: derive it from a build-time constant or rename per client.
5. Add a test (`tests/unit/brand-config.test.mjs`). It fails if "1Line", "سوهاج", `line-c9601`, `201223222956` or `ykuhk4dxes` appear in `src/` or `api/` outside `siteConfig.js`, `areasData.js` and `translations.js`. That keeps future work from re-hard-coding the brand.
6. Acceptance: the 1Line site renders **pixel-identical** (compare Playwright screenshots of `/`, `/properties`, `/properties/:id`, `/sell` and `/crm` before and after), and all tests pass.

### Phase 2: Identity swap (logo, colors, name)
1. **Assets in `public/`:**
   - `logo-emblem.png` (512, transparent) and `favicon.svg`.
   - `icon-192.png` (192×192), `icon-512.png` (512×512) and `icon-maskable-512.png`, emblem at ~65 % on a solid background.
   - `apple-touch-icon.png` (180×180) and `og-image.jpg` (1200×630).
   - Regenerate `public/screenshots/*` (1080×1920 phone, 1920×1200 desktop) from the new home hero, rendered in Cairo.
   - Remove `founder-dr-mahmoud-elbaz.jpg` and 1Line videos. Replace them, or hide the sections.
2. **Colors:** change only the base tokens in `src/index.css` (`--navy-950/900/800`, `--gold`, `--gold-dark`, `--gold-soft`, `--gold-300/400`, sand/ivory) and their dark-mode block, plus the matching `--ui-*` brand tokens in `src/styles/tokens.css`.
   - Then grep for literal `#0B1B32`, `#07111F`, `#B38A45`, `#C5A059`, `#D9B97E`, `#ECC875` and `rgba(197, 160, 89` in public CSS (`styles/*.css`, `App.css`, `property-card.css`, `install-app.css`) and map each to the new palette.
   - Keep contrast ≥ 4.5:1 for text. Check light and dark themes.
3. **`manifest.json`:** `name`, `short_name`, `description`, `theme_color`, `background_color`, shortcuts labels. Also `index.html` `<meta name="theme-color">` and `apple-mobile-web-app-title`.
4. **Copy:** `translations.js` and page texts. Replace the brand name, city names and the founder's story.
   - Keep the structure and tone: short Egyptian Arabic, no exaggerated claims, no invented numbers. `VERIFIED_STATS` / `SELLER_PROOF` stay `null` unless documented.
5. Acceptance: no 1Line name, logo, phone, founder or Sohag-specific text left (the Phase-1 test passes with the new values). Screenshots of 8 key screens attached to the PR.

### Phase 3: Client data (areas, roles, settings)
1. `utils/areasData.js`: replace with the client's city → sector → district hierarchy. Keep the shape (ids, `name_ar`, `name_en`, sector links) because filters, matching, pricing benchmarks and analytics use it. Remove 1Line's market price benchmarks unless the client provides real comparables.
2. `SERVICE_AREAS`, `CONTACT`, `LEGAL_IDS` in `siteConfig.js`.
3. CRM roles and desks (`crmRoles.js`, `rbacRules.js` `DESK_BY_ROLE`, `firestore.rules` `leadDesk()`): rename to the client's teams, all three together, then run `npm run test:rules`.
4. Remove demo/sample data from the bundle (`src/data/*Data.js`) or keep it flagged `isDemo` and hidden from the public catalog. Never publish 1Line listings.
5. Default commission % (`utils/commission.js` `DEFAULT_COMMISSION_PCT`) and stage probabilities if the client gives their own numbers.

### Phase 4: New infrastructure wiring (owner + AI)
The AI prepares config and docs; the **owner** does every step that needs an account (§6). After the owner has created the new Firebase project and pasted the **public** web config into the Brand sheet:
1. Update the project id everywhere it is pinned:
   - `firebase.js` / env defaults.
   - `FIREBASE_PROJECT` in `.github/workflows/firebase-deploy.yml`, where the deploy refuses a key for another project.
   - The `--project line-c9601` flags in `package.json` scripts.
   - The emulator project ids in `tests/rules/*.test.mjs` and `tests/unit/team.test.mjs`.
2. Deploy rules and indexes **only after the owner says so**: run `firebase-deploy.yml` with `{"task":"rules"}` on `main`.
3. The owner signs in once on `/crm`. Then, with approval, run `scripts/ensure-admin-claim.mjs` with the new `ADMIN_UID` (the owner runs it, or a GitHub Action with the secret).
4. Seed `settings/*` docs (site settings, homepage slots) from the CRM UI, not scripts.

### Phase 5: Verification before launch
- `npm run lint && npm test && npm run build`, `npm run test:rules`, and CI green.
- Playwright on the emulator build (`VITE_FIREBASE_EMULATORS=true npx vite build --outDir dist-journey`, serve on 127.0.0.1):
  - Phone 375×740 and desktop 1366×800.
  - Home, properties, unit page, sell wizard (no submit on production), menu taps, consent bar, install button (iPhone and Pixel profiles), and CRM login → leads → drawer → save commission (drawer stays open).
- Chrome DevTools `Page.getAppManifest`: no errors.
- A visitor reads 0 Firestore docs (catalog comes from `/api/catalog`).
- Grep the built `dist/` for the old brand: zero hits.

---

## 4. Design system (keep exactly)
- **Look:** "executive luxury". Deep navy surfaces, a warm metallic accent (gold for 1Line), sand/ivory backgrounds, white cards with soft shadows, glass header capsule, large rounded radii (16–24 px), pill buttons.
- **Header:** floating glass capsule. `.site-header` has `pointer-events: none` and only the capsule and the mobile drawer take taps; keep that, or menu links stop working.
- **Phones:**
  - Bottom navigation: الرئيسية، العقارات، تواصل (centre FAB)، التمويل، مقارنة.
  - Header buttons 40 px. Theme and language live in the drawer.
  - Consent bar is one compact row.
- **Typography:** Cairo for everything. Tabular numbers instead of monospace. Latin digits.
- **CRM:** built only from `src/components/ui/*` and `--ui-*` tokens (`styles/tokens.css`). The lint ratchet blocks new raw hex colors, inline styles and `!important` in CRM code.
- **Motion:** subtle (`motion` library). Respect `prefers-reduced-motion`.
- **Accessibility:** 44 px touch targets where possible, visible focus rings, `aria-label` on icon buttons, dialogs with `role="dialog"` + Esc to close, contrast ≥ 4.5:1.

---

## 5. Behaviours that must survive the rebrand
1. **One lead per request.** A returning phone adds `returningClient`, `previousLeadId` and `previousRequest`; it never merges automatically.
2. **Offline queue** (`services/leads.js`): a failed submit is stored and retried. Permission-denied / invalid-argument are dropped; everything else is kept.
3. **Seller photos** go to Vercel Blob through `api/seller-upload.js` (validated type and size, rate-limited), never into Firestore.
4. **WhatsApp alert** to staff for every new request (`api/notify.js`): request id, time, summary, last 3 phone digits, photo count. Rate-limited, with one flood warning.
5. **Analytics** (`utils/analytics.js` → `api/track.js`):
   - Batches every 30 s.
   - Pauses 30 min on Firestore 429; `ANALYTICS_PAUSED=1` stops it.
   - Raw data deleted after 180 days by `analytics-cleanup.yml` (dry run until the repo variable `ANALYTICS_CLEANUP=on`).
6. **Stock photos** of old sample listings are hidden from visitors (`utils/sampleDataFlags.js`). A unit with no photos shows "صور الوحدة لسه بتتجهّز", never an empty frame. The floor-plan tab shows only a real uploaded plan.
7. **Expected commission:** stage probabilities (new 5 %, contacted 15 %, site visit 30 %, negotiating 50 %, closing 80 %, closed 100 %); closing a lead stamps `closedAt`.
8. **Public portals:** keep only those in `services_ar`, and remove the others from the router, header, sitemap and footer together.

---

## 6. Owner checklist (not for the AI)
| Step | Where |
|---|---|
| New GitHub repo from this code | GitHub |
| New Firebase project, **Spark** plan; enable Firestore (pick the region nearest the client's visitors) + Email/Google auth | console.firebase.google.com |
| Copy the **web config** (public) into the Brand sheet | Firebase → Project settings → Your apps |
| Service-account JSON → secret `FIREBASE_SERVICE_ACCOUNT` in **Vercel** and **GitHub Actions**. Never paste it in chat. | Vercel → Env Vars; GitHub → Secrets |
| `BACKUP_PASSPHRASE` → GitHub secret | GitHub → Secrets |
| New Vercel project: **Pro plan** for commercial use; connect domain; set `VITE_SITE_URL`, `BLOB_READ_WRITE_TOKEN`, WhatsApp vars, optional `ANALYTICS_PAUSED` | vercel.com |
| Set `regions` in `vercel.json` to the Vercel region closest to the Firestore location | ask the AI after you know the location |
| New Microsoft Clarity project (optional) | clarity.microsoft.com |
| First sign-in on `/crm`, then send your uid for the admin claim | the site |
| Protect `main` (require CI) | GitHub → Settings → Branches |
| App Check: enforce only after traffic shows "Verified" | Firebase → App Check |
| Google Play (optional): Play Console account + `assetlinks.json` after the domain works | play.google.com/console |

---

## 7. Acceptance for the whole job
- Same layout and behaviour as 1Line on phone and desktop, with only identity and data changed.
- Zero traces of 1Line in `src/`, `api/`, `public/`, `index.html` and the built `dist/`. That means name, logo, phone, founder, Sohag text, Firebase ids, Clarity id, storage prefix and SW cache name.
- All tests, rules tests and CI green. Manifest has no errors. Menu, consent, install button and the CRM lead flow verified on the emulator.
- The PR descriptions list what the owner still has to do from §6.
