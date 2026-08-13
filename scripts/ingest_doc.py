"""Ingest a markdown/text document into MongoDB chunks with embeddings."""

from __future__ import annotations

import argparse
import re
import statistics
import sys
import time
from pathlib import Path

from engram.config import CHUNK_MAX_CHARS, CHUNK_MIN_CHARS

_ALLOWED_SUFFIXES = {".md", ".txt"}
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")


def _join(parts: list[str]) -> str:
    return "\n\n".join(parts)


def _split_sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_SPLIT.split(text.strip()) if part.strip()]


def chunk_text(text: str) -> list[str]:
    paragraphs = [p.strip() for p in _PARAGRAPH_SPLIT.split(text.strip()) if p.strip()]
    chunks: list[str] = []
    buf: list[str] = []

    def buf_len() -> int:
        return len(_join(buf)) if buf else 0

    def close() -> None:
        if buf:
            chunks.append(_join(buf))
            buf.clear()

    def would_exceed(unit: str) -> bool:
        if not buf:
            return False
        return buf_len() + 2 + len(unit) > CHUNK_MAX_CHARS

    def add_unit(unit: str) -> None:
        if len(unit) > CHUNK_MAX_CHARS:
            close()
            chunks.append(unit)
            return
        if would_exceed(unit):
            close()
        buf.append(unit)
        if buf_len() >= CHUNK_MIN_CHARS:
            close()

    for para in paragraphs:
        if len(para) > CHUNK_MAX_CHARS:
            for sent in _split_sentences(para):
                add_unit(sent)
            continue
        add_unit(para)

    close()
    return chunks


def _print_stats(chunks: list[str], elapsed_s: float) -> None:
    lengths = [len(c) for c in chunks]
    mean_len = statistics.mean(lengths) if lengths else 0.0
    min_len = min(lengths) if lengths else 0
    max_len = max(lengths) if lengths else 0
    print(
        f"chunks={len(chunks)} min={min_len} max={max_len} "
        f"mean={mean_len:.1f} elapsed_s={elapsed_s:.2f}"
    )


def _print_boundaries(chunks: list[str]) -> None:
    for i, chunk in enumerate(chunks):
        print(f"--- chunk {i} ({len(chunk)} chars) ---")
        print(chunk)
        print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Chunk, embed, and ingest a document.")
    parser.add_argument("--path", required=True, help="Path to a .md or .txt document")
    parser.add_argument("--doc-id", required=True, help="Document slug stored as doc_id")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print chunk boundaries without writing to Mongo",
    )
    args = parser.parse_args(argv)

    path = Path(args.path)
    if path.suffix.lower() not in _ALLOWED_SUFFIXES:
        parser.error(f"unsupported file type {path.suffix!r}; only .md and .txt")
    if not path.is_file():
        parser.error(f"file not found: {path}")

    started = time.perf_counter()
    text = path.read_text(encoding="utf-8")
    chunks = chunk_text(text)

    if args.dry_run:
        _print_boundaries(chunks)
        _print_stats(chunks, time.perf_counter() - started)
        return 0

    from engram.db import chunks as chunks_col
    from engram.db import ensure_indexes
    from engram.embed import embed

    ensure_indexes()
    deleted = chunks_col.delete_many({"doc_id": args.doc_id})
    if deleted.deleted_count:
        print(f"deleted {deleted.deleted_count} existing chunks for doc_id={args.doc_id}")

    embeddings = embed(chunks)
    docs = []
    for ord_, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        docs.append(
            {
                "doc_id": args.doc_id,
                "ord": ord_,
                "text": chunk,
                "embedding": vector,
                "kind": None,
                "n_chars": len(chunk),
            }
        )
    if docs:
        chunks_col.insert_many(docs)

    _print_stats(chunks, time.perf_counter() - started)
    return 0


if __name__ == "__main__":
    sys.exit(main())
