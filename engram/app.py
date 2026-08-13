from pathlib import Path

from bson import ObjectId
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from engram.agent.grade import grade_text
from engram.agent.quiz import due_chunks, next_quiz
from engram.config import (
    COLD_START_N,
    DEFAULT_USER,
    DEMO_CHUNKS_CSV,
    DEMO_DOC_ID,
    DEMO_SESSION_CSV,
    SEED_DOC_ID,
)
from engram.db import beliefs, chunks, ensure_indexes, profiles, sessions
from engram.eeg.features import load_manifest
from engram.eeg.replay import encoding_by_chunk
from engram.state import (
    apply_evidence,
    apply_manifest_priors,
    now_utc,
    p_encoded_of,
    select_for_user,
)

_ROOT = Path(__file__).resolve().parents[1]
_STATIC = _ROOT / "static"

app = FastAPI(title="Engram")
app.mount("/static", StaticFiles(directory=_STATIC), name="static")


class AnswerBody(BaseModel):
    chunk_id: str
    text: str


class QuizBody(BaseModel):
    doc_id: str = DEMO_DOC_ID


@app.on_event("startup")
def _startup() -> None:
    ensure_indexes()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


def _serialize_belief(chunk: dict, belief: dict | None) -> dict:
    prior_p = None
    p = None
    if belief is not None:
        a0, b0 = belief["alpha0"], belief["beta0"]
        prior_p = a0 / (a0 + b0) if (a0 + b0) else None
        p = p_encoded_of(belief)
    return {
        "chunk_id": str(chunk["_id"]),
        "doc_id": chunk["doc_id"],
        "ord": chunk["ord"],
        "text": chunk["text"],
        "n_chars": chunk["n_chars"],
        "kind": chunk.get("kind"),
        "p_encoded": p,
        "p_prior": prior_p,
        "encoding_index": None if belief is None else belief.get("encoding_index"),
        "review_count": 0 if belief is None else belief.get("review_count", 0),
        "alpha": None if belief is None else belief["alpha"],
        "beta": None if belief is None else belief["beta"],
    }


@app.get("/api/beliefs/{doc_id}")
def get_beliefs(doc_id: str) -> dict:
    items = []
    for chunk in chunks.find({"doc_id": doc_id}).sort("ord", 1):
        belief = beliefs.find_one({"user_id": DEFAULT_USER, "chunk_id": chunk["_id"]})
        items.append(_serialize_belief(chunk, belief))
    return {"doc_id": doc_id, "chunks": items}


@app.get("/api/profile")
def get_profile() -> dict:
    doc = profiles.find_one({"user_id": DEFAULT_USER}, {"_id": 0, "weak_concepts.centroid": 0})
    return doc or {"user_id": DEFAULT_USER, "summary": "No profile yet. Run seed_session.py."}


def _greeting() -> tuple[str, list[dict]]:
    weak = select_for_user(k=COLD_START_N, review_count_min=1)
    named = []
    parts = []
    for rec in weak:
        chunk = rec["chunk"]
        preview = chunk["text"].split("\n", 1)[0][:80]
        parts.append(f"ord {chunk['ord']} on {chunk['doc_id']} (p={rec['p_encoded']:.2f}: {preview})")
        named.append(
            {
                "chunk_id": str(chunk["_id"]),
                "doc_id": chunk["doc_id"],
                "ord": chunk["ord"],
                "p_encoded": rec["p_encoded"],
                "preview": preview,
            }
        )
    if not parts:
        text = "No prior quiz history yet. Heatmap is from the neural prior only."
    else:
        text = "Last session you were weakest on: " + "; ".join(parts) + "."
    return text, named


@app.post("/api/session/start")
def start_session() -> dict:
    scores = encoding_by_chunk(DEMO_SESSION_CSV, DEMO_CHUNKS_CSV)
    labels = [row["chunk"] for row in load_manifest(DEMO_CHUNKS_CSV)]
    apply_manifest_priors(DEMO_DOC_ID, scores, labels, note="demo eeg")
    started = now_utc()
    result = sessions.insert_one(
        {
            "user_id": DEFAULT_USER,
            "doc_id": DEMO_DOC_ID,
            "started_ts": started,
            "ended_ts": None,
            "source": "replay",
            "chunks_dwelt": 0,
        }
    )
    greeting_text, weak = _greeting()
    return {
        "session_id": str(result.inserted_id),
        "greeting_audio_url": None,
        "greeting_text": greeting_text,
        "due_chunks": due_chunks(DEMO_DOC_ID),
        "weak_history": weak,
        "seed_doc_id": SEED_DOC_ID,
        "demo_doc_id": DEMO_DOC_ID,
    }


@app.post("/api/quiz/next")
def quiz_next(body: QuizBody) -> dict:
    item = next_quiz(body.doc_id)
    if item is None:
        raise HTTPException(status_code=404, detail="no scored chunks for this document")
    return item


@app.post("/api/quiz/answer")
def quiz_answer(body: AnswerBody) -> dict:
    try:
        chunk_oid = ObjectId(body.chunk_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="invalid chunk_id") from exc
    chunk = chunks.find_one({"_id": chunk_oid})
    if chunk is None:
        raise HTTPException(status_code=404, detail="chunk not found")
    belief = beliefs.find_one({"user_id": DEFAULT_USER, "chunk_id": chunk_oid})
    if belief is None:
        raise HTTPException(status_code=404, detail="no belief for chunk")
    p_before = p_encoded_of(belief)
    score, weight = grade_text(chunk["text"], body.text)
    updated = apply_evidence(belief, score=score, weight=weight, note="typed quiz")
    p_after = p_encoded_of(updated)
    return {
        "transcript": body.text,
        "score": score,
        "weight": weight,
        "p_before": p_before,
        "p_after": p_after,
        "chunk_id": body.chunk_id,
        "ord": chunk["ord"],
        "p_prior": updated["alpha0"] / (updated["alpha0"] + updated["beta0"]),
    }
