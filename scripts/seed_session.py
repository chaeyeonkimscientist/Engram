"""Ingest is assumed done. Write seed priors, two quiz rounds, backdate, profile."""

from __future__ import annotations

import sys
from datetime import timedelta

from sklearn.cluster import KMeans

from engram.config import (
    DEFAULT_USER,
    PROFILE_KMEANS_K,
    SEED_BACKDATE_DAYS,
    SEED_CHUNKS_CSV,
    SEED_DOC_ID,
    SEED_SESSION_CSV,
    SELECT_K,
    WEAK_BELIEF,
)
from engram.db import beliefs, chunks, ensure_indexes, profiles
from engram.eeg.features import load_manifest
from engram.eeg.replay import encoding_by_chunk
from engram.state import apply_evidence, apply_manifest_priors, now_utc, p_encoded_of, select_for_doc

_ROUND_SCORES = (
    (0.20, 0.90, 0.40, 0.75, 0.15),
    (0.55, 0.30, 0.85, 0.10, 0.70),
)


def _apply_eeg_priors(doc_id: str, scores: dict[str, float], manifest_csv: str, note: str) -> int:
    labels = [row["chunk"] for row in load_manifest(manifest_csv)]
    return apply_manifest_priors(doc_id, scores, labels, note)


def _simulate_quizzes(doc_id: str) -> None:
    for round_i, scores in enumerate(_ROUND_SCORES, start=1):
        picked = select_for_doc(doc_id, k=SELECT_K)
        for rec, s in zip(picked, scores):
            apply_evidence(
                rec["belief"],
                score=s,
                weight=1.0,
                note=f"seed quiz round {round_i}",
            )
            print(f"  round {round_i} ord={rec['chunk']['ord']} s={s:.2f}")


def _backdate(doc_id: str) -> None:
    delta = timedelta(days=SEED_BACKDATE_DAYS)
    ids = [c["_id"] for c in chunks.find({"doc_id": doc_id}, {"_id": 1})]
    for belief in beliefs.find({"user_id": DEFAULT_USER, "chunk_id": {"$in": ids}}):
        evidence = []
        for ev in belief.get("evidence", []):
            item = dict(ev)
            item["ts"] = ev["ts"] - delta
            evidence.append(item)
        beliefs.update_one(
            {"_id": belief["_id"]},
            {
                "$set": {
                    "last_evidence_ts": belief["last_evidence_ts"] - delta,
                    "created_ts": belief["created_ts"] - delta,
                    "evidence": evidence,
                }
            },
        )


def _build_profile() -> None:
    now = now_utc()
    weak_vecs = []
    weak_labels = []
    kind_sum: dict[str, list[float]] = {}
    for chunk in chunks.find():
        belief = beliefs.find_one({"user_id": DEFAULT_USER, "chunk_id": chunk["_id"]})
        if belief is None:
            continue
        p = p_encoded_of(belief, now)
        kind = chunk.get("kind") or "unspecified"
        kind_sum.setdefault(kind, []).append(p)
        if p < WEAK_BELIEF:
            weak_vecs.append(chunk["embedding"])
            weak_labels.append(f"{chunk['doc_id']}#{chunk['ord']}")
    weak_kinds = {k: sum(v) / len(v) for k, v in kind_sum.items() if v}
    concepts = []
    if weak_vecs:
        k = min(PROFILE_KMEANS_K, len(weak_vecs))
        km = KMeans(n_clusters=k, n_init=10, random_state=0)
        km.fit(weak_vecs)
        for i, center in enumerate(km.cluster_centers_):
            member_ps = []
            for idx, label in enumerate(km.labels_):
                if label == i:
                    doc_id, ord_s = weak_labels[idx].split("#")
                    ch = chunks.find_one({"doc_id": doc_id, "ord": int(ord_s)})
                    bel = beliefs.find_one({"user_id": DEFAULT_USER, "chunk_id": ch["_id"]})
                    member_ps.append(p_encoded_of(bel, now))
            concepts.append(
                {
                    "label": f"weak-{i}",
                    "centroid": center.tolist(),
                    "mean_belief": sum(member_ps) / len(member_ps) if member_ps else 0.0,
                }
            )
    summary = (
        f"{DEFAULT_USER} has {len(weak_labels)} weak passages after decay. "
        f"Lowest-belief labels: {', '.join(weak_labels[:5]) or 'none'}."
    )
    profiles.replace_one(
        {"user_id": DEFAULT_USER},
        {
            "user_id": DEFAULT_USER,
            "weak_kinds": weak_kinds,
            "weak_concepts": concepts,
            "summary": summary,
            "updated_ts": now,
        },
        upsert=True,
    )
    print(summary)


def main() -> int:
    ensure_indexes()
    n_chunks = chunks.count_documents({"doc_id": SEED_DOC_ID})
    if n_chunks == 0:
        print(f"no chunks for {SEED_DOC_ID}; run ingest_doc.py first", file=sys.stderr)
        return 1
    print("scoring seed EEG…")
    scores = encoding_by_chunk(SEED_SESSION_CSV, SEED_CHUNKS_CSV)
    for label, e in scores.items():
        print(f"  {label:20s} encoding_index={e:.3f}")
    beliefs.delete_many({"user_id": DEFAULT_USER})
    profiles.delete_many({"user_id": DEFAULT_USER})
    print("writing neural priors…")
    _apply_eeg_priors(SEED_DOC_ID, scores, SEED_CHUNKS_CSV, note="seed eeg")
    print("simulating quiz rounds…")
    _simulate_quizzes(SEED_DOC_ID)
    print(f"backdating {SEED_BACKDATE_DAYS} days…")
    _backdate(SEED_DOC_ID)
    print("building profile…")
    _build_profile()
    print("seed session ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
