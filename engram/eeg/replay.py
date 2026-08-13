"""Score a recorded session immediately (demo does not wait on wall-clock)."""

from engram.config import BASELINE_CSV
from engram.eeg.features import baseline_stats, score_session

_stats = None


def _cached_baseline() -> dict:
    global _stats
    if _stats is None:
        _stats = baseline_stats(BASELINE_CSV)
    return _stats


def encoding_by_chunk(session_csv: str, manifest_csv: str) -> dict[str, float]:
    return score_session(session_csv, manifest_csv, _cached_baseline())
