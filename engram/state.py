"""Mongo-backed belief state. I/O lives here, not in belief.py."""

from datetime import datetime, timezone

from engram.belief import adjust_half_life, decay, prior_from_index, select_lowest, update
from engram.config import DEFAULT_USER, HALF_LIFE_H, SELECT_K
from engram.db import beliefs, chunks


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(ts: datetime) -> datetime:
    if ts.tzinfo is None:
        return ts.replace(tzinfo=timezone.utc)
    return ts


def hours_since(ts: datetime, now: datetime | None = None) -> float:
    now = now or now_utc()
    return max(0.0, (now - as_utc(ts)).total_seconds() / 3600.0)


def p_encoded_of(belief: dict, now: datetime | None = None) -> float:
    return decay(
        belief["alpha"],
        belief["beta"],
        belief["alpha0"],
        belief["beta0"],
        hours_since(belief["last_evidence_ts"], now),
        belief["half_life_hours"],
    )


def write_neural_prior(
    chunk: dict,
    encoding_index: float | None,
    user_id: str = DEFAULT_USER,
    ts: datetime | None = None,
    note: str = "neural",
) -> dict:
    ts = ts or now_utc()
    existing = beliefs.find_one({"user_id": user_id, "chunk_id": chunk["_id"]})
    if existing is not None:
        return existing
    if encoding_index is None:
        alpha0, beta0 = 1.0, 1.0
        e = 0.0
        note = "unscored"
    else:
        alpha0, beta0 = prior_from_index(encoding_index)
        e = float(encoding_index)
    doc = {
        "user_id": user_id,
        "chunk_id": chunk["_id"],
        "alpha": alpha0,
        "beta": beta0,
        "alpha0": alpha0,
        "beta0": beta0,
        "encoding_index": e,
        "half_life_hours": HALF_LIFE_H,
        "review_count": 0,
        "last_evidence_ts": ts,
        "created_ts": ts,
        "evidence": [
            {"ts": ts, "type": "neural", "score": e, "weight": 1.0, "note": note},
        ],
    }
    beliefs.insert_one(doc)
    return beliefs.find_one({"user_id": user_id, "chunk_id": chunk["_id"]})


def apply_manifest_priors(
    doc_id: str,
    scores_by_label: dict[str, float],
    labels: list[str],
    note: str,
    user_id: str = DEFAULT_USER,
) -> int:
    n = 0
    for chunk in chunks.find({"doc_id": doc_id}).sort("ord", 1):
        label = labels[chunk["ord"]] if chunk["ord"] < len(labels) else None
        encoding = scores_by_label.get(label) if label else None
        write_neural_prior(
            chunk,
            encoding,
            user_id=user_id,
            note=note if encoding is not None else "unscored",
        )
        n += 1
    return n


def apply_evidence(
    belief: dict,
    score: float,
    weight: float,
    note: str = "quiz",
    ts: datetime | None = None,
) -> dict:
    ts = ts or now_utc()
    alpha, beta = update(belief["alpha"], belief["beta"], score, weight)
    half_life = adjust_half_life(belief["half_life_hours"], score)
    beliefs.update_one(
        {"_id": belief["_id"]},
        {
            "$set": {
                "alpha": alpha,
                "beta": beta,
                "half_life_hours": half_life,
                "last_evidence_ts": ts,
            },
            "$inc": {"review_count": 1},
            "$push": {
                "evidence": {
                    "ts": ts,
                    "type": "quiz",
                    "score": score,
                    "weight": weight,
                    "note": note,
                }
            },
        },
    )
    return beliefs.find_one({"_id": belief["_id"]})


def _records(
    query: dict,
    user_id: str,
    review_count_min: int,
    now: datetime,
) -> list[dict]:
    records = []
    for chunk in chunks.find(query).sort("ord", 1):
        belief = beliefs.find_one({"user_id": user_id, "chunk_id": chunk["_id"]})
        if belief is None:
            continue
        if belief.get("review_count", 0) < review_count_min:
            continue
        records.append(
            {
                "alpha": belief["alpha"],
                "beta": belief["beta"],
                "alpha0": belief["alpha0"],
                "beta0": belief["beta0"],
                "hours_since": hours_since(belief["last_evidence_ts"], now),
                "half_life": belief["half_life_hours"],
                "n_chars": chunk["n_chars"],
                "chunk": chunk,
                "belief": belief,
            }
        )
    return records


def select_for_doc(
    doc_id: str,
    k: int | None = None,
    user_id: str = DEFAULT_USER,
    review_count_min: int = 0,
    now: datetime | None = None,
) -> list[dict]:
    now = now or now_utc()
    k = SELECT_K if k is None else k
    picked = select_lowest(_records({"doc_id": doc_id}, user_id, review_count_min, now), k)
    for rec in picked:
        rec["p_encoded"] = p_encoded_of(rec["belief"], now)
    return picked


def select_for_user(
    k: int | None = None,
    user_id: str = DEFAULT_USER,
    review_count_min: int = 0,
    now: datetime | None = None,
) -> list[dict]:
    now = now or now_utc()
    k = SELECT_K if k is None else k
    picked = select_lowest(_records({}, user_id, review_count_min, now), k)
    for rec in picked:
        rec["p_encoded"] = p_encoded_of(rec["belief"], now)
    return picked
