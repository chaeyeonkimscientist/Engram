"""Chunk targeting and question text. No voice."""

from engram.config import EXCERPT_CHARS, SELECT_K
from engram.state import select_for_doc


def next_quiz(doc_id: str, k: int | None = None) -> dict | None:
    picked = select_for_doc(doc_id, k=1 if k is None else k)
    if not picked:
        return None
    rec = picked[0]
    chunk = rec["chunk"]
    excerpt = chunk["text"].strip().replace("\n", " ")
    if len(excerpt) > EXCERPT_CHARS:
        excerpt = excerpt[:EXCERPT_CHARS].rsplit(" ", 1)[0] + "…"
    return {
        "chunk_id": str(chunk["_id"]),
        "ord": chunk["ord"],
        "doc_id": chunk["doc_id"],
        "p_encoded": rec["p_encoded"],
        "question_text": (
            "What is the key mechanism or claim in this passage? "
            "Name it in your own words."
        ),
        "excerpt": excerpt,
        "n_chars": chunk["n_chars"],
    }


def due_chunks(doc_id: str, k: int | None = None) -> list[dict]:
    k = SELECT_K if k is None else k
    out = []
    for rec in select_for_doc(doc_id, k=k):
        chunk = rec["chunk"]
        out.append(
            {
                "chunk_id": str(chunk["_id"]),
                "ord": chunk["ord"],
                "p_encoded": rec["p_encoded"],
                "n_chars": chunk["n_chars"],
                "preview": chunk["text"][:160].replace("\n", " "),
            }
        )
    return out
