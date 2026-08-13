"""Thin HTTP layer over the engram package.

Run with:  uvicorn engram.api:app --reload --port 8000

All belief math lives in engram.belief -- this module only reads/writes Mongo
documents and translates them to JSON.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engram import belief
from engram.config import DEFAULT_USER, HALF_LIFE_H

# Evidence weights for the two event types the reader can emit. A dwell is much
# weaker evidence than a graded recall answer, so it carries a smaller weight.
DWELL_S = 1.0
DWELL_W = 0.35

# Neutral prior index for a chunk we have never seen evidence for. engram.belief
# turns this into alpha0/beta0 via prior_from_index.
DEFAULT_PRIOR_INDEX = 0.5

app = FastAPI(title="Engram API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Mongo access
#
# engram.db raises at import time when MONGODB_URI is unset, and connects
# lazily afterwards. We import it on first use so the server still boots (and
# /health still answers) on a machine with no Mongo configured.
# --------------------------------------------------------------------------


def _db() -> Any:
    try:
        from engram import db
    except Exception as exc:  # noqa: BLE001 - surfaced to the client as 503
        raise HTTPException(
            status_code=503,
            detail={"error": "mongo_unavailable", "message": str(exc)},
        ) from exc
    return db


def _require_collections() -> tuple[Any, Any]:
    db = _db()
    return db.chunks, db.beliefs


# --------------------------------------------------------------------------
# Belief helpers
# --------------------------------------------------------------------------


def _now() -> float:
    return time.time()


def _new_belief(user_id: str, chunk_id: Any, prior_index: float = DEFAULT_PRIOR_INDEX) -> dict:
    alpha0, beta0 = belief.prior_from_index(prior_index)
    return {
        "user_id": user_id,
        "chunk_id": chunk_id,
        "alpha": alpha0,
        "beta": beta0,
        "alpha0": alpha0,
        "beta0": beta0,
        "half_life": HALF_LIFE_H,
        "last_evidence_ts": _now(),
        "n_evidence": 0,
    }


def _hours_since(doc: dict, now: float | None = None) -> float:
    now = _now() if now is None else now
    last = doc.get("last_evidence_ts") or now
    return max(0.0, (now - last) / 3600.0)


def _p_encoded(doc: dict, now: float | None = None) -> float:
    """Current P(encoded) for a belief doc, decayed to now."""
    return belief.decay(
        doc["alpha"],
        doc["beta"],
        doc["alpha0"],
        doc["beta0"],
        _hours_since(doc, now),
        doc.get("half_life", HALF_LIFE_H),
    )


def _confidence(doc: dict) -> float:
    """How much evidence backs this belief, squashed to [0,1] for the UI.

    Not part of the belief model -- the frontend uses it to render uncertainty
    (blur) separately from the posterior mean.
    """
    mass = (doc["alpha"] + doc["beta"]) - (doc["alpha0"] + doc["beta0"])
    return min(1.0, max(0.0, mass / 4.0))


def _belief_map(beliefs_col: Any, user_id: str, chunk_ids: list[Any]) -> dict[str, dict]:
    if not chunk_ids:
        return {}
    cursor = beliefs_col.find({"user_id": user_id, "chunk_id": {"$in": chunk_ids}})
    return {str(doc["chunk_id"]): doc for doc in cursor}


def _resolve_chunk(chunks_col: Any, chunk_id: str) -> dict:
    """Look a chunk up by ObjectId hex, or by the 'doc_id:ord' composite key."""
    from bson import ObjectId
    from bson.errors import InvalidId

    try:
        found = chunks_col.find_one({"_id": ObjectId(chunk_id)}, {"embedding": 0})
    except (InvalidId, TypeError):
        found = None

    if found is None and ":" in chunk_id:
        doc_id, _, ord_ = chunk_id.rpartition(":")
        if ord_.isdigit():
            found = chunks_col.find_one(
                {"doc_id": doc_id, "ord": int(ord_)}, {"embedding": 0}
            )

    if found is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "chunk_not_found", "chunk_id": chunk_id},
        )
    return found


def _apply_evidence(
    chunk_id: str, s: float, w: float, user_id: str, *, is_recall: bool = True
) -> dict:
    """Run one Beta-Bernoulli update through engram.belief and persist it.

    `is_recall` gates the half-life adjustment. belief.adjust_half_life is keyed
    off RECALL_GROW_S / RECALL_SHRINK_S -- it models the testing effect, so only
    a graded answer should move the half-life. A dwell contributes evidence mass
    without claiming the passage was successfully retrieved.
    """
    chunks_col, beliefs_col = _require_collections()
    chunk = _resolve_chunk(chunks_col, chunk_id)

    existing = beliefs_col.find_one({"user_id": user_id, "chunk_id": chunk["_id"]})
    doc = existing or _new_belief(user_id, chunk["_id"])

    now = _now()
    p_before = _p_encoded(doc, now)

    # Decay first so the recorded alpha/beta reflect elapsed time, then apply
    # the new evidence on top of the decayed state.
    lam = 0.5 ** (_hours_since(doc, now) / doc.get("half_life", HALF_LIFE_H))
    alpha_eff = doc["alpha0"] + lam * (doc["alpha"] - doc["alpha0"])
    beta_eff = doc["beta0"] + lam * (doc["beta"] - doc["beta0"])

    alpha, beta = belief.update(alpha_eff, beta_eff, s, w)
    half_life = doc.get("half_life", HALF_LIFE_H)
    if is_recall:
        half_life = belief.adjust_half_life(half_life, s)

    updated = {
        **doc,
        "alpha": alpha,
        "beta": beta,
        "half_life": half_life,
        "last_evidence_ts": now,
        "n_evidence": int(doc.get("n_evidence", 0)) + 1,
    }
    updated.pop("_id", None)

    beliefs_col.update_one(
        {"user_id": user_id, "chunk_id": chunk["_id"]},
        {"$set": updated},
        upsert=True,
    )

    p_after = _p_encoded(updated, now)
    return {
        "chunk_id": str(chunk["_id"]),
        "doc_id": chunk.get("doc_id"),
        "ord": chunk.get("ord"),
        "p_before": p_before,
        "p_after": p_after,
        "delta": p_after - p_before,
        "alpha": alpha,
        "beta": beta,
        "half_life": half_life,
        "confidence": _confidence(updated),
        "n_evidence": updated["n_evidence"],
        "s": s,
        "w": w,
    }


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    """Liveness, plus whether Mongo is actually reachable."""
    from engram.config import DB_NAME

    result: dict[str, Any] = {
        "status": "ok",
        "db_name": DB_NAME,
        "mongo": {"reachable": False},
    }
    try:
        from engram import db

        started = time.perf_counter()
        db.client.admin.command("ping")
        result["mongo"] = {
            "reachable": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
            "chunks": db.chunks.estimated_document_count(),
            "beliefs": db.beliefs.estimated_document_count(),
        }
    except Exception as exc:  # noqa: BLE001 - health must never 500
        result["status"] = "degraded"
        result["mongo"] = {
            "reachable": False,
            "error": type(exc).__name__,
            "message": str(exc)[:400],
        }
    return result


@app.get("/documents")
def list_documents(user_id: str = DEFAULT_USER) -> dict:
    """Ingested documents with an aggregate retention value per document."""
    chunks_col, beliefs_col = _require_collections()

    rows = list(chunks_col.find({}, {"embedding": 0}).sort([("doc_id", 1), ("ord", 1)]))
    if not rows:
        return {"documents": [], "user_id": user_id}

    beliefs = _belief_map(beliefs_col, user_id, [r["_id"] for r in rows])
    now = _now()

    grouped: dict[str, dict] = {}
    for row in rows:
        doc_id = row["doc_id"]
        bucket = grouped.setdefault(
            doc_id,
            {
                "doc_id": doc_id,
                "title": doc_id.replace("-", " ").replace("_", " ").strip().title(),
                "chunk_count": 0,
                "n_chars": 0,
                "ps": [],
                "seen_count": 0,
            },
        )
        bucket["chunk_count"] += 1
        bucket["n_chars"] += int(row.get("n_chars") or len(row.get("text") or ""))

        existing = beliefs.get(str(row["_id"]))
        if existing is None:
            bucket["ps"].append(
                _p_encoded(_new_belief(user_id, row["_id"]), now)
            )
        else:
            bucket["ps"].append(_p_encoded(existing, now))
            bucket["seen_count"] += 1

    documents = []
    for bucket in grouped.values():
        ps = bucket.pop("ps")
        documents.append(
            {
                **bucket,
                "retention": sum(ps) / len(ps) if ps else 0.0,
                "at_risk_count": sum(1 for p in ps if p < 0.4),
            }
        )

    documents.sort(key=lambda d: d["doc_id"])
    return {"documents": documents, "user_id": user_id}


@app.get("/documents/{doc_id}/chunks")
def document_chunks(doc_id: str, user_id: str = DEFAULT_USER) -> dict:
    """The chunks of a document in reading order, each with current P(encoded)."""
    chunks_col, beliefs_col = _require_collections()

    rows = list(chunks_col.find({"doc_id": doc_id}, {"embedding": 0}).sort("ord", 1))
    if not rows:
        raise HTTPException(
            status_code=404, detail={"error": "document_not_found", "doc_id": doc_id}
        )

    beliefs = _belief_map(beliefs_col, user_id, [r["_id"] for r in rows])
    now = _now()

    chunks = []
    for row in rows:
        existing = beliefs.get(str(row["_id"]))
        doc = existing or _new_belief(user_id, row["_id"])
        chunks.append(
            {
                "chunk_id": str(row["_id"]),
                "doc_id": row["doc_id"],
                "ord": row["ord"],
                "text": row.get("text", ""),
                "n_chars": int(row.get("n_chars") or len(row.get("text") or "")),
                "kind": row.get("kind"),
                "p_encoded": _p_encoded(doc, now),
                "confidence": _confidence(doc),
                "alpha": doc["alpha"],
                "beta": doc["beta"],
                "half_life": doc.get("half_life", HALF_LIFE_H),
                "n_evidence": int(doc.get("n_evidence", 0)),
                "has_evidence": existing is not None,
            }
        )

    return {
        "doc_id": doc_id,
        "title": doc_id.replace("-", " ").replace("_", " ").strip().title(),
        "user_id": user_id,
        "chunks": chunks,
    }


class DwellBody(BaseModel):
    seconds: float | None = Field(default=None, ge=0)
    user_id: str = DEFAULT_USER


@app.post("/chunks/{chunk_id}/dwell")
def record_dwell(chunk_id: str, body: DwellBody | None = None) -> dict:
    """The dwell gate fired on a chunk. Weak positive evidence."""
    body = body or DwellBody()
    result = _apply_evidence(chunk_id, DWELL_S, DWELL_W, body.user_id, is_recall=False)
    return {**result, "event": "dwell", "seconds": body.seconds}


class AnswerBody(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="Semantic correctness in [0,1]")
    confidence: float = Field(default=1.0, ge=0.0, le=2.0, description="Evidence weight")
    user_id: str = DEFAULT_USER


@app.post("/chunks/{chunk_id}/answer")
def record_answer(chunk_id: str, body: AnswerBody) -> dict:
    """A graded quiz answer. Returns old and new P plus the signed contribution."""
    result = _apply_evidence(chunk_id, body.score, body.confidence, body.user_id)
    return {**result, "event": "answer"}
