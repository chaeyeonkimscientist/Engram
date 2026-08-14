# Engram

**Your reading, remembered by a copilot that models your memory.**

Readers waste time re-reading what already stuck and skim past what never
landed — and no tool knows the difference. Engram estimates what is *encoded*
per passage from a low-SNR neural prior, fuses that prior with quiz outcomes and
spoken-answer confidence into a per-chunk belief `P(encoded)` in MongoDB, then
has an agent quiz and re-surface only the low-belief chunks.

The thesis is **no cold start**: the agent already knows what you under-encode.

This repo holds the design system and frontend (Next.js) plus the belief engine
and API (Python/FastAPI/MongoDB).

---

## Quick start — frontend

```bash
npm install
cp .env.local.example .env.local     # NEXT_PUBLIC_ENGRAM_API_URL
npm run dev
```

| Route     | What it is                                                        |
| --------- | ----------------------------------------------------------------- |
| `/`       | Hero / identity.                                                  |
| `/design` | **The design system showcase.** Every token, every component state. |

Open <http://localhost:3000/design>. If port 3000 is taken, Next picks the next
free port and prints it.

The frontend never hard-depends on the backend. Every call in `src/lib/api.ts`
falls back to fixtures after a 2s timeout and reports `source: "mock"`, which the
UI surfaces as a small `REPLAY` label rather than hiding it.

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run build
```

## Quick start — backend

Full detail in [`backend/README.md`](backend/README.md).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env                 # then fill in MONGODB_URI

# chunk, embed and write a document to Mongo
python -m scripts.ingest_doc --path data/docs/mongodb-part1.md --doc-id mongodb-part1

# serve the API on :8000
uvicorn engram.api:app --reload --port 8000
```

`MONGODB_URI` is required for live data; the database is `engram` and the vector
index is `chunk_vec`. Interactive API docs at <http://localhost:8000/docs>.

## Layout

```
src/app/design/      the showcase route — start here
src/components/engram/   all visual primitives
src/lib/tokens.ts     typed mirror of the CSS token layer
src/lib/belief.ts     the single belief → visual mapping
src/lib/lattice.ts    the mark: one node lattice, four densities
src/lib/api.ts        typed client; never throws, falls back to fixtures
reference/            the source-of-truth identity page
engram/               belief math, Mongo access, embeddings, FastAPI
scripts/              ingest
```

## The design language, in one paragraph

Near-monochrome: a single atmospheric ramp from bone to void, no accent — if
something needs to stand out it moves along the ramp rather than being coloured.
**Density is the belief**: the logo is one gooey node lattice, and a chunk's
`P(encoded)` renders as that lattice interpolated from sparse to fused, so the
identity reports the state of the reader. Confidence is a second, cheap channel —
low-evidence beliefs render soft, well-evidenced ones crisp. Exactly one hue
exists outside the ramp, a desaturated clay reserved solely for the at-risk tail.

`DESIGN.md` documents the token scale, the mapping and its rationale, the orb
state machine, and what we deliberately do not build.

## What this is not

No chat sidebar, no message bubbles, no settings screen, no login, no toolbar of
feature icons. Engram is an instrument, not a chatbot — the belief number and its
update stay visible on screen while the agent speaks.
