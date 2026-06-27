# CLAUDE.md

> Claude Code automatically reads this file at the start of every session. Keep it short, current, and high-signal. For full project history see `PROJECT_SUMMARY.md`.

## Project
AccessRead — accessibility-first OCR app (React Native / Expo 50, TypeScript). Scans text/medicine/food/currency/color/barcode and reads it aloud. Targets iOS, Android, Web from one codebase.

## Current priority
Get the app **compiling and running locally**, then prove **one real OCR scan end-to-end**. The codebase is a strong scaffold but has not been run or integrated yet. See `PROJECT_SUMMARY.md` §7 for the ordered build sequence.

## Commands
```bash
npm install              # install deps (may need --legacy-peer-deps)
npm start                # expo dev server
npx expo start --web     # fastest target to verify changes
npx tsc --noEmit         # type-check
npm test                 # jest
npm run lint             # eslint (if configured)
```

## Architecture (how things fit)
- `src/services/` — all external integrations (OCR, auth, payments, TTS, etc). Services are decoupled and called from screens via the Zustand store.
- `src/store/appStore.ts` — Zustand global state. Screens read/write here; services do the side effects.
- `src/screens/` — UI. `src/components/` — reusable UI (loading states, etc).
- `src/constants/premiumDesign.ts` — the design system. **Always pull colors/spacing/typography from here, never hardcode.**
- `src/i18n/` — translations. User-facing strings go through i18n, not inline literals.
- `backend/` — Node/Express API gateway. `validation.ts` holds auth + rate limiting + DB schema.
- `infrastructure/` — Terraform + K8s for future scale. **Do not touch or deploy unless explicitly asked.**

## Conventions
- TypeScript everywhere in app code. Prefer fixing types over `any`.
- Pull design tokens from `premiumDesign.ts`. No magic color/spacing values.
- User-facing text goes through i18n (`src/i18n/`).
- Errors should use the typed errors in `errorHandlingService.ts`, not generic strings.
- Keep secrets in `.env.local` (gitignored). Never commit keys.

## Guardrails (important)
- **Do not deploy or modify `infrastructure/`** without an explicit request — it provisions ~$5–6K/month of cloud resources meant for post-traction scale.
- **Web before native.** Validate on Vercel before app-store builds.
- **Don't chase 95% test coverage yet.** Get critical paths (OCR, error handling) passing first.
- Before adding a new dependency, check it's not already in `package.json`.
- When you wire up a service or ship a screen, update the checkboxes in `PROJECT_SUMMARY.md` §7.

## Env vars
Defined in `.env.local` (see `.env.local.example`). First one that matters: `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` — needed for the end-to-end scan test.
