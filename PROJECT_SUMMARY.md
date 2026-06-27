# AccessRead — Project Summary & Claude Code Onboarding

> **Read this first.** This document is the single source of truth for the AccessRead codebase. It exists so any agent or developer (including Claude Code) can get full context without re-reading every file. Keep it updated as the project evolves.

---

## 1. What AccessRead Is

**Tagline:** "Read the world. Independently."

**Product:** An accessibility-first OCR app. It scans text, medicine labels, food packaging, currency, colors, and barcodes, then reads them aloud with realistic voices. Built primarily for blind, low-vision, and print-disabled users who need independent access to printed information.

**Platforms:** iOS, Android, Web (single React Native / Expo 50 codebase)

**Repo:** github.com/haniihussein90-crypto/accessread

**Business model:**
- Free: 50 scans/month
- Premium Monthly: $4.99
- Premium Yearly: $39.99 (positioned as "save $19.89")
- Institutional licensing path: ~$2K/month per institution

**Revenue goal:** $1.1M ARR in year one (aspirational — see "Reality Check" in §8).

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| App framework | React Native + Expo 50 (TypeScript) |
| State | Zustand |
| Offline storage | WatermelonDB |
| Auth + cloud sync | Firebase |
| OCR | Google Cloud Vision API |
| Text-to-speech | ElevenLabs |
| Payments | RevenueCat + Stripe |
| Crash tracking | Sentry |
| Analytics | Mixpanel |
| Backend | Node.js API gateway (Express) |
| Web deploy | Vercel |
| Native deploy | EAS (Expo Application Services) |

---

## 3. Current State (BE HONEST WITH YOURSELF HERE)

**What exists:** A large, coherent set of production-quality code *templates* — services, screens, a design system, error handling, tests, i18n, and infrastructure-as-code.

**What does NOT yet exist:**
- The app has **not been compiled, run, or integrated end-to-end**.
- Files reference each other but aren't fully wired together.
- Tests reference services whose implementations need connecting.
- **No API keys are live.** Nothing talks to a real external service yet.
- The infrastructure (Terraform/K8s) describes a ~$5–6K/month setup intended for *post-traction* scale, not day one.

**Translation:** Treat the code as a strong scaffold, not a shipping product. The next phase is making it actually run.

---

## 4. File Map

> Source files currently live under `/mnt/user-data/outputs/` from the build sessions. **Step 1 is to move them into a real git repo on your machine.** Paths below are relative to the repo root once moved.

```
accessread/
├── PROJECT_SUMMARY.md              ← this file (keep at root)
├── package.json
├── app.json                        ← Expo config
├── .env.local                      ← API keys (DO NOT COMMIT — see §6)
├── .env.local.example
│
├── src/
│   ├── services/                   ← 15 core services
│   │   ├── googleVisionOcrService.ts
│   │   ├── firebaseAuthService.ts
│   │   ├── paymentService.ts
│   │   ├── elevenLabsTtsService.ts
│   │   ├── errorTrackingService.ts
│   │   ├── offlineDbService.ts
│   │   ├── analyticsService.ts
│   │   ├── batchScanService.ts
│   │   ├── barcodeService.ts
│   │   ├── costOptimizationService.ts
│   │   ├── accessibilityService.ts
│   │   ├── localizationService.ts
│   │   └── errorHandlingService.ts   ← 20+ typed errors + freemium logic
│   │
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── EmergencyScreen.tsx
│   │   └── FeatureImplementations.tsx ← search, export, settings, security, privacy
│   │
│   ├── components/
│   │   └── LoadingStates.tsx          ← skeletons, progress, sync status, empty states
│   │
│   ├── constants/
│   │   └── premiumDesign.ts           ← design system (colors, type, spacing, shadows)
│   │
│   ├── i18n/
│   │   └── index.ts                   ← 15+ languages, RTL, date/number/currency
│   │
│   ├── store/
│   │   └── appStore.ts                ← Zustand store
│   │
│   └── App.tsx
│
├── backend/
│   ├── server.ts                      ← API gateway
│   ├── validation.ts                  ← auth, rate limiting, request signing, DB schema
│   └── observability.js               ← Datadog/Prometheus/ELK (scale phase)
│
├── __tests__/
│   └── services.test.ts               ← 300+ unit + integration tests
│
└── infrastructure/                    ← SCALE PHASE ONLY — do not deploy day one
    ├── terraform/main.tf              ← multi-region AWS (~$5–6K/mo)
    └── kubernetes/deployment.yaml     ← HPA autoscaling, zero-downtime deploys
```

---

## 5. What's Been Done (Full History)

### Phase 1 — Core product (15 services)
Google Vision OCR, Firebase auth + sync, RevenueCat/Stripe payments, ElevenLabs TTS (50+ voices), Sentry, WatermelonDB offline, Node backend, Mixpanel, onboarding flow, emergency UX (1-tap calling + country detection + personal contacts), batch scanning, barcode + product lookup, cost optimization, accessibility service, localization scaffold.

Design system: dark `#2d3748`, blue `#1E88E5`, green `#0F6E56`; 6 scan types (general, medicine, food, currency, color, barcode); parental-consent flow; medicine-scan medical disclaimer.

### Phase 2 — Code review fixes (MVP 60→90/100)
1. Premium design system
2. Image optimization (5MB→150KB, ~80% API cost cut)
3. Typed error handling (20+ error types with user guidance)
4. Freemium conversion flow (target 15% vs 2% baseline)
5. Loading states / skeletons / empty states / sync indicator
6. Testing (300+ tests, 95% coverage target)
7. Accessibility (WCAG 2.1 AAA checklist, VoiceOver/TalkBack)
8. Backend validation (auth middleware, rate limiting, request signing)
9. Normalized DB schema (6 collections, indexed)
10. Missing features (search, filter, pull-to-refresh, CSV/JSON export, notifications, 2FA, GDPR data controls)
11. Refined business logic / pricing / paywall triggers

### Phase 3 — Global scale infrastructure
Multi-region Terraform (US/EU/APAC, Aurora Postgres + read replicas, ElastiCache Redis, Cloudflare global LB + failover); Kubernetes (HPA 3→50 pods, zero-downtime deploys, network policies, background workers); observability (Datadog APM, ELK, Prometheus, AlertManager + PagerDuty, custom business metrics); i18n (15+ languages, RTL, CJK, locale formatting).

### Phase 4 — Deployment tooling
`deploy.sh` (automated GitHub + Vercel + CI/CD + EAS), `TOKEN_CHECKLIST.md`, `DEPLOYMENT_QUICK_START.md`, GitHub Actions CI/CD.

---

## 6. Environment Variables Needed

Create `.env.local` (never commit it). Get keys from each provider:

| Variable | Provider | Cost | Priority |
|----------|----------|------|----------|
| `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` | console.cloud.google.com | $0.60/1K | **FIRST** |
| `EXPO_PUBLIC_FIREBASE_*` (8 vars) | console.firebase.google.com | Free tier | High |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | elevenlabs.io | $5–99/mo | Medium |
| RevenueCat iOS + Android keys | revenuecat.com | 3.99% rev | Medium |
| `STRIPE_SECRET_KEY` + webhook | stripe.com | 2.9% + $0.30 | Medium |
| `EXPO_PUBLIC_SENTRY_DSN` | sentry.io | Free 5K events | Low |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | mixpanel.com | Free | Low |

`.env.local.example` lists all variable names with placeholder values.

---

## 7. RECOMMENDED SEQUENCE FOR CLAUDE CODE

Do these in order. Each step must work before moving on.

### Step 0 — Repo setup
- [ ] Move all files from the build outputs into a clean git repo
- [ ] `git init`, commit this `PROJECT_SUMMARY.md` first
- [ ] Add a proper `.gitignore` (node_modules, `.env.local`, `.expo/`, `dist/`, build artifacts)

### Step 1 — Make it compile and run locally ⭐ START HERE
- [ ] `npm install` (resolve any peer-dependency conflicts)
- [ ] Fix import paths and missing module references
- [ ] Resolve TypeScript errors (`npm run type-check` if defined, else `npx tsc --noEmit`)
- [ ] Get a dev server running: `npm start` / `npx expo start`
- [ ] Goal: app boots in Expo (web target is fastest to verify)

### Step 2 — One real scan end-to-end
- [ ] Add a live `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`
- [ ] Wire camera/upload → image optimization → Vision OCR → on-screen text
- [ ] Confirm a real photo of text returns real recognized text
- [ ] This is the single most important validation in the whole project

### Step 3 — Make the tests real
- [ ] Connect test mocks to actual service implementations
- [ ] Get `npm test` green (start with the OCR + error-handling suites)
- [ ] Don't chase 95% coverage yet — get the critical paths passing

### Step 4 — Wire the core screens together
- [ ] Navigation between Home → Scan → Results → History → Settings
- [ ] Hook Zustand store to real service calls (not stubs)
- [ ] Verify offline save (WatermelonDB) and sync indicator behave

### Step 5 — Deploy WEB to Vercel
- [ ] `npx expo export -p web` (or the project's web build command)
- [ ] Deploy to Vercel, get a live URL
- [ ] Share for feedback. **Validate the product before native stores.**

### Step 6 — Native app stores (only after web is validated)
- [ ] Apple Developer enroll ($99/yr), Google Play ($25 one-time)
- [ ] `eas build` then `eas submit` for both platforms

### Step 7 — Layer in the rest as needed
- [ ] Auth + payments once core scanning is proven
- [ ] i18n languages once you have users in those markets
- [ ] **Infrastructure (Terraform/K8s) ONLY when traffic justifies the cost**

---

## 8. Reality Check / Guardrails

Keep these front of mind so effort goes where it matters:

- **Don't deploy the global infrastructure early.** The Terraform/K8s setup is ~$5–6K/month for capacity you won't use until you have real scale. Web-on-Vercel + Firebase free tier carries you a long way.
- **Web first, native second.** Web validates the product in hours, not days, with no app-store review.
- **One working scan beats ten polished screens.** The OCR pipeline is the product. Prove it before anything else.
- **Revenue projections are targets, not facts.** The $1.1M figure assumes conversion and retention rates that must be earned. Treat early months as learning, not earning.
- **Keep this file updated.** When something changes (a service gets wired up, a key goes live, a screen ships), reflect it here so context never goes stale.

---

## 9. Good First Prompt for Claude Code

Paste something like this when you open the repo in Claude Code:

> "Read PROJECT_SUMMARY.md in full. Then start on Step 1 from §7: get this app compiling and running locally. Run npm install, fix imports and TypeScript errors, and get me to a working Expo dev server on the web target. Show me errors as you hit them and explain the fixes. Don't touch the infrastructure/ folder."

---

*Last updated: this hand-off. Update the date and the checkboxes in §7 as you make progress.*
