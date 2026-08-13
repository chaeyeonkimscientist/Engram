# Engram backend

Python package `engram/` (belief math, Mongo access, embeddings) plus a thin
FastAPI layer at `engram/api.py`. The Next.js frontend talks to it through
`src/lib/api.ts`.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then fill in MONGODB_URI
```

`.env` lives at the repo root and is read by `engram/db.py`.

| Variable            | Meaning                                                   |
| ------------------- | --------------------------------------------------------- |
| `MONGODB_URI`       | Mongo/Atlas connection string. **Required** for live data. |
| `MONGODB_TIMEOUT_MS`| Server-selection timeout, default `5000`.                  |

Database name is `engram` and the vector index is `chunk_vec`
(see `engram/config.py`).

## Ingest a sample document

```bash
source .venv/bin/activate

# preview chunk boundaries without writing to Mongo
python -m scripts.ingest_doc --path data/docs/mongodb-part1.md --doc-id mongodb-part1 --dry-run

# chunk, embed, and write to Mongo (creates indexes on first run)
python -m scripts.ingest_doc --path data/docs/mongodb-part1.md --doc-id mongodb-part1
python -m scripts.ingest_doc --path data/docs/mongodb-part2.md --doc-id mongodb-part2
```

First real ingest downloads the `all-MiniLM-L6-v2` embedding model and waits for
the Atlas vector index to become queryable, so it takes a minute or two.

## Run the API

```bash
source .venv/bin/activate
uvicorn engram.api:app --reload --port 8000
```

Interactive docs at <http://localhost:8000/docs>. CORS is open to
`http://localhost:3000`.

## Run the frontend

```bash
cp .env.local.example .env.local     # NEXT_PUBLIC_ENGRAM_API_URL
npm install
npm run dev
```

The frontend never hard-depends on this server: every call in `src/lib/api.ts`
falls back to mock fixtures and reports `source: "mock"`. You can develop the UI
with the backend down.

## Endpoints

| Method | Path                        | Purpose                                                     |
| ------ | --------------------------- | ----------------------------------------------------------- |
| `GET`  | `/health`                   | Liveness plus whether Mongo is actually reachable.          |
| `GET`  | `/documents`                | Ingested docs with aggregate `retention` per doc.           |
| `GET`  | `/documents/{doc_id}/chunks`| Chunks in reading order with current `p_encoded`.           |
| `POST` | `/chunks/{chunk_id}/dwell`  | Dwell gate fired. Weak positive evidence.                   |
| `POST` | `/chunks/{chunk_id}/answer` | Graded answer `{score, confidence}`. Returns the delta.     |

All take an optional `user_id` (default `demo_user` from `config.py`).
`chunk_id` accepts either the Mongo `_id` hex or a `doc_id:ord` composite.

When Mongo is unconfigured or unreachable, `/health` answers `200` with
`status: "degraded"` and the data routes answer `503` with a structured
`{"detail": {"error": "mongo_unavailable", ...}}` body — never a stack trace.

## Belief model

All posterior math is `engram/belief.py` (unit tests in `test_belief.py`); the
API only reads and writes documents.

- A chunk with no evidence gets a neutral prior via `prior_from_index(0.5)`,
  which is `P(encoded) = 0.5`.
- Every event decays the stored posterior toward the prior for elapsed time,
  then applies `update(alpha, beta, s, w)`.
- `adjust_half_life` is applied on `/answer` only — it models the testing
  effect, and a dwell is not a successful retrieval.
- A dwell is `s = 1.0, w = 0.35`; an answer is `s = score, w = confidence`.

```bash
source .venv/bin/activate && pytest test_belief.py
```
