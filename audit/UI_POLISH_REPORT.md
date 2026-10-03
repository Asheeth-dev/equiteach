# EquiTeach — UI Polish Report

## UI/UX Before
- Landing didn't say who it's for; three stat tiles ("10 / 1–5 / Instant") said little.
- Mode buttons had no explanation of what each produces.
- Demo required 10 manual scores — slow and error-prone on stage.
- Raw technical error text on save failure, no retry.
- Result score (e.g. 33/50) had no context for what it meant; the focus metric wasn't marked in the profile.
- Missing aria-pressed / aria-current / focus rings on custom buttons.

## UI/UX After
- Landing: audience line, concise Problem / Solution / Different strip, mode cards with outcome hints, "10 metrics · ~2 min · no sign-in".
- Observation: "Demo: fill a sample observation", keyboard scoring (1–5), check marks on scored metrics, "N left to score", clearer copy, metric title animates on change.
- Errors: human message ("your scores are still here") + Try again button; technical detail goes to console only.
- Results: tier scale (Critical / Developing / Proficient) with a marker at the actual score; coaching-focus metric highlighted in amber in the behavior profile; bars shaded by strength.
- Accessibility: aria-pressed, aria-current, fieldset/legend, visible focus rings.
- Fixed a pre-existing type error on the global error page.

## Demo Experience
Landing explains the product in 5 seconds → one click to start → anchors make scoring obvious → live projected score updates → result shows verdict, scale position, the one weakest behavior, and a scripted coaching conversation → PDF export.

## Wow Factor
1. Live calibration: the projected score and tier update with every tap, and the "current focus" panel predicts the coaching topic before you finish.
2. Results: weakest behavior highlighted on the profile, linked to an Ask / Describe / Ask coaching script built from its anchors. The same scores always give the same result.

## Verification
Full flow (landing → in-service → sample fill → save → result → PDF download) passed at 1280px and 390px: no horizontal overflow, no console errors, PDF downloaded.

## Remaining UX Issues
- Teacher portrait is a fixed demo photo regardless of name entered.
- No history view of past evaluations (by design — anonymous reads are disabled).
- Tablet (768px) observation layout stacks; usable but long.

## Do Not Touch
- `src/lib/evaluation.ts` scoring and feedback logic.
- `src/lib/evaluations.functions.ts` save path and database policies.
- `src/lib/evaluation-report.ts` PDF export.

## Logic boundary
No changes to the database schema, server function, scoring, or PDF code. No new dependencies or assets. The demo sample fill only sets values on the page.
