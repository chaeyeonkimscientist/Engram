"""Typed-answer grader. Weight is 1.0 (no transcript latency features)."""

import math

from engram.config import GRADE_COS_LO, GRADE_COS_SPAN
from engram.embed import embed


def grade_text(chunk_text: str, answer: str) -> tuple[float, float]:
    if not answer.strip():
        return 0.0, 1.0
    vectors = embed([chunk_text, answer])
    a = vectors[0]
    b = vectors[1]
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0.0 or nb == 0.0:
        return 0.0, 1.0
    cos = dot / (na * nb)
    score = max(0.0, min(1.0, (cos - GRADE_COS_LO) / GRADE_COS_SPAN))
    return score, 1.0
