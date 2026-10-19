# Copy Style — Seobot Voice & Tone

> The prose half of the brand guidelines. The machine-readable half is `src/content/brand.ts` (voice principles, tone matrix, taglines, copy patterns); the research behind both is `docs/brand-research.md`; SEO-specific copy rules live in `docs/content-models.md` §14. When they disagree, fix one of them in the same PR.

**Voice in one line:** precise about the data, direct about the next step, allergic to hype.

---

## 1. The four principles

Each principle ships with a rewrite. Copy that fails two or more principles gets rewritten, not softened.

| # | Principle | Do | Don't |
|---|---|---|---|
| 1 | **Answer first.** Open every block — page, email, error, tooltip — with the conclusion. The first sentence must survive alone in an AI answer, a Slack unfurl, or a support search. | "Seobot audits your site daily and ranks every issue by traffic impact." | "In today's fast-paced digital landscape, SEO matters more than ever." |
| 2 | **Show the number.** Specifics build trust; superlatives burn it. Every stat carries value, source, and year. | "47% of sites fail Core Web Vitals (Chrome UX Report, 2026)." | "The world's most powerful SEO platform." |
| 3 | **Talk like an operator.** Write the way a good SEO lead talks at standup: verbs, tools, tasks, deadlines. If a word only lives in decks, it doesn't ship. | "Send this week's briefs to your writers, then watch rankings." | "Leverage synergistic AI solutions to unlock growth." |
| 4 | **Keep the promise small and true.** No fake countdowns, no guaranteed #1s. State exactly what happens, when, and what's included. | "Free 14-day trial. No credit card. Cancel in two clicks." | "Get guaranteed page-one rankings in 24 hours!" |

---

## 2. Voice vs tone

**Voice is constant. Tone flexes by the surface and the reader's state of mind.** The same person reads your hero ad, your error toast, and your billing page in three different moods; the voice stays recognizable, the register adjusts.

| Surface | Reader | Tone | Sample |
|---|---|---|---|
| Landing hero | Skeptical buyer, three tabs open | Confident, concrete, zero hype | "Grow organic traffic on autopilot." |
| Product UI | SEO manager mid-task | Quiet, precise, second person | "3 issues need review. Start with the broken canonical on /pricing." |
| Empty states | New user one step from first value | Warm, directional, one action | "No audits yet. Connect your site and we'll crawl it in about 3 minutes." |
| Errors | Blocked user deciding to trust us | Calm, factual, recovery-first | "We couldn't reach your site — the server timed out. We'll retry in 15 minutes, or you can run a manual crawl now." |
| Billing | Nervous buyer reading small print | Plain, unambiguous, no dark patterns | "Your plan renews March 14 at $79. Cancel anytime — you keep access until then." |
| Docs & API | Implementer who wants to be done | Dry, complete, example-led | "POST /v1/audits returns 202 with a job ID." |

**The register never goes below "professional peer" and never above "excited."** No "Oops!", no "Whoopsie", no jokes inside errors — people are worried about their data. Humor is allowed where nothing is at stake (empty states, 404s, changelog), and it must be dry, not wacky.

---

## 3. Mechanics

**Naming**

- Always **Seobot** — never "Seo Bot", "SeoBot", or "SEO Bot". Lowercase "seobot" appears only inside the logo, nowhere in prose.
- First mention on any page states the category: "Seobot, an SEO platform, …" — keeps entity extraction unambiguous (content-models §14.1).

**Grammar & voice**

- Second person ("you"), present tense, active voice. "We" means the team/product, used sparingly; "I" never appears in product copy.
- Contractions are fine ("we'll", "you're") — they match how an operator actually talks.
- Sentence case for all headings, buttons, labels, tabs, and menu items. Title Case is reserved for proper nouns.
- No exclamation points in UI. A shipped report is "Report ready." — not "Report ready!". Save the exclamation for the changelog confetti, if ever.
- One thought per sentence. If a sentence needs a second em dash, it needs a second sentence.

**Numbers & dates**

- Numerals for anything measurable: "3 issues", "2 weeks", "500 keywords". Spell out only rhetorical counts ("the one fix that matters").
- Stats format: `number + unit + source + year`. If it can't be sourced, it doesn't ship.
- Dates in UI: "March 14, 2026". Dates in code/content modules: ISO (`2026-03-14`). Never fake freshness — `updatedAt` changes only on meaningful edits.

**Links & accessibility**

- Link text describes the destination: "See the pricing breakdown" — never "click here" or "read more" alone.
- Target plain language at roughly grade 8. Avoid idioms and wordplay in any copy that gates a task (errors, billing, security).

---

## 4. Copy patterns

Formulas for the moments writers touch most. Same set lives in `brand.ts` (`copyPatterns`) so UI and docs can't drift.

| Moment | Formula | Example |
|---|---|---|
| Button | `[Verb] + [object]` | "Run site audit" — not "Submit", never "Click here" |
| Error | `[What happened] → [what to do]` | "We couldn't reach your site — the server timed out. We'll retry in 15 minutes." |
| Empty state | `No [thing] yet → [action] to [outcome]` | "No reports yet. Schedule one to get your first digest on Monday." |
| Toast (success) | `[Object] + [past-tense verb]`, under 5 words | "Report scheduled." · "Brief sent to Slack." |
| Upgrade nudge | `[Value received] → [the limit] → [one action]` | "You've tracked 2,500 of 2,500 keywords. Upgrade to keep tracking — your history stays put." |
| Destructive confirm | Say exactly what gets deleted, and what doesn't | "Delete the Northwind project? Audits and reports are removed for everyone. Exports stay." |

Notes that apply to all of them:

- **Buttons answer "what happens next?"** A user should be able to predict the result from the label alone.
- **Errors lead with the thing that failed**, not with an apology. "We couldn't save your changes" beats "Something went wrong."
- **Empty states name the reason** (new account ≠ no results ≠ filtered to nothing) and offer exactly one primary action.
- **Success toasts are past tense and tiny.** If it needs a sentence, it belongs in a notification, not a toast.
- **Upsells state the limit before the ask** and never threaten data. "Your history stays put" is the standard.

---

## 5. SEO copy rules (summary — full contract in content-models §14)

1. **Definition-first:** the first paragraph of every commercial page answers "What is this?" in 2–3 standalone sentences an AI engine can quote verbatim.
2. **FAQ answers are 40–60 words**, answer-first, self-contained. Visible text and FAQPage schema must match byte-for-byte (the SEO audit enforces this).
3. **Tables beat bullets** for any 2+ way comparison — AI engines extract tables preferentially.
4. **CTAs match funnel stage:** TOFU → newsletter/free tool; MOFU → free trial; BOFU → start trial / talk to sales.
5. **Every content page shows Published/Updated.** Never fake freshness.

---

## 6. Words

**We use:** audit · fix · brief · crawl · rank · ship · monitor · prioritized · sourced · verified · weekly · impact

**We don't:** leverage · utilize · seamless · supercharge · unlock · revolutionary · game-changing · best-in-class · cutting-edge · synergy · guaranteed rankings · Oops!

The avoid-list has one rule behind it: **if the word adds heat but no information, cut it.** The use-list is deliberately verbs-first — the product exists to move work, and the copy should read like it.

---

## 7. Governance

- **One owner.** The content lead has the final call on borderline copy. Committees broaden voice until it means nothing.
- **Quarterly voice audit.** Pull 20 random strings from the last 90 days (emails, errors, ads, support replies), rate on-voice ✓ / off-voice ✗, fix the failures. Patterns surface fast.
- **Changes go through the repo.** Copy standards live in `brand.ts` and this doc; a voice change is a PR that updates both, so the UI guidelines page (Brand view) updates itself.
