# Quiz — "Should I migrate?"

A short, transparent, **stateless** quiz that scores a visitor's readiness to
own their setup and recommends published guides matched to where they are. Lives
at `/quiz`. Collects no PII and persists no attempt.

## The scorer (`src/modules/quiz/logic.ts`)

One pure, framework-free module shared by every interaction style and any API
caller. Six questions:

| Question | Axis | Scores |
| --- | --- | --- |
| `platform` | context (guide matching) | 0 |
| `cli` | CLI comfort | 0–2 |
| `budget` | budget | 0–2 |
| `time` | time available | 0–2 |
| `data` | data sensitivity (context) | 0 |
| `motivation` | resolve | 0–2 |

Readiness score is 0–8 (four axes at 2 each; platform and data are context, not
score). `computeResult(answers, guides)` returns:

- **verdict** — `ready` (≥5) · `start-small` (≥2) · `prep-first` (<2)
- **headline + narrative** explaining the verdict
- **difficultyCeiling** — 3 / 2 / 1 (advanced / intermediate / beginner)
- **matches** — published guides at or below the ceiling, preferring the same
  `source_platform`, always falling back to the first eligible guide so the
  result never renders empty when guides exist.

The scorer is deliberately legible so the result screen can show *why* (the
"Readiness X of Y" bar). Fixtures in `logic.test.ts` lock the verdict + ceiling
for representative answer sets.

## The three interaction styles

`QuizClient` owns the single answer state and drives the one scorer; the styles
are pure layout over it (a `?style=` query param selects one, default `wizard`):

- **wizard** — one question per screen with Back / Next.
- **scroll** — every question stacked, one "See result" action.
- **split** — a sticky progress pane beside the current question.

Guides are fetched server-side in `app/(public)/quiz/page.tsx`
(`listPublishedEntries("guide")`) and passed in, so the island does no data
fetching.

## Fit it to your cause

- **Reword the questions / options** in `QUIZ_QUESTIONS` — keep option scores in
  `0..2` so the max stays 8, or adjust `MAX_SCORE`/`verdictFor` together for a
  different scale.
- **Recommend something other than guides** — `matchGuides` takes any
  `EntryRow[]`; point the page at a different entry type and update the card
  links in `ResultView`.
- **Change the thresholds** in `verdictFor` and the ceilings in `VERDICTS`.

## FAQ

**Is anything stored?** No. The quiz is stateless — no attempt row, no cookie,
no PII. (You could persist attempts by adding a `quiz/actions.ts` insert, but
the default is stateless by design.)

**Can I embed it elsewhere?** The scorer is pure and import-safe; render
`QuizClient` anywhere you can pass the guide set, or call `computeResult`
directly from an API route.
