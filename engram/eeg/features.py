"""CSV EEG -> per-window encoding index. No database I/O."""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
from scipy.signal import welch

from engram.config import (
    ALPHA_HI_HZ,
    ALPHA_LO_HZ,
    ARTIFACT_UV,
    EEG_CHANNELS,
    EEG_FS,
    MIN_WINDOWS,
    THETA_HI_HZ,
    THETA_LO_HZ,
    WINDOW_OVERLAP,
    WINDOW_S,
)

_REPO = Path(__file__).resolve().parents[2]
_POWER_FLOOR = 1e-12


def _resolve(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else _REPO / p


def load_muse_csv(path: str | Path) -> tuple[np.ndarray, np.ndarray]:
    raw = np.genfromtxt(_resolve(path), delimiter=",", names=True, dtype=None, encoding="utf-8")
    timestamps = np.asarray(raw["timestamps"], dtype=float)
    data = np.column_stack([np.asarray(raw[ch], dtype=float) for ch in EEG_CHANNELS])
    return timestamps, data


def load_manifest(path: str | Path) -> list[dict]:
    with _resolve(path).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for row in rows:
        out.append(
            {
                "chunk": row["chunk"],
                "enc_level": float(row["enc_level"]),
                "start_s": float(row["start_s"]),
                "end_s": float(row["end_s"]),
            }
        )
    return out


def _band_power(sig: np.ndarray, lo: float, hi: float) -> float:
    nperseg = min(int(EEG_FS), len(sig))
    freqs, psd = welch(sig, fs=EEG_FS, nperseg=nperseg)
    band = (freqs >= lo) & (freqs <= hi)
    if not np.any(band):
        return _POWER_FLOOR
    return float(np.mean(psd[band]))


def _window_features(window: np.ndarray) -> tuple[float, float] | None:
    if np.any(window.max(axis=0) - window.min(axis=0) > ARTIFACT_UV):
        return None
    tp9, af7, af8, tp10 = window.T
    theta = 0.5 * (_band_power(af7, THETA_LO_HZ, THETA_HI_HZ) + _band_power(af8, THETA_LO_HZ, THETA_HI_HZ))
    alpha = 0.5 * (_band_power(tp9, ALPHA_LO_HZ, ALPHA_HI_HZ) + _band_power(tp10, ALPHA_LO_HZ, ALPHA_HI_HZ))
    return float(np.log(theta + _POWER_FLOOR)), float(np.log(alpha + _POWER_FLOOR))


def _iter_windows(data: np.ndarray) -> list[tuple[int, int]]:
    win = int(WINDOW_S * EEG_FS)
    hop = int(WINDOW_S * (1.0 - WINDOW_OVERLAP) * EEG_FS)
    hops = max(hop, 1)
    spans = []
    start = 0
    while start + win <= len(data):
        spans.append((start, start + win))
        start += hops
    return spans


def baseline_stats(path: str | Path) -> dict:
    _, data = load_muse_csv(path)
    theta_logs = []
    alpha_logs = []
    for a, b in _iter_windows(data):
        feat = _window_features(data[a:b])
        if feat is None:
            continue
        theta_logs.append(feat[0])
        alpha_logs.append(feat[1])
    theta = np.asarray(theta_logs, dtype=float)
    alpha = np.asarray(alpha_logs, dtype=float)
    if len(theta) == 0:
        raise RuntimeError(f"no surviving baseline windows in {path}")
    return {
        "theta_mean": float(theta.mean()),
        "theta_sd": float(theta.std()) or 1.0,
        "alpha_mean": float(alpha.mean()),
        "alpha_sd": float(alpha.std()) or 1.0,
    }


def _encoding_index(log_theta: float, log_alpha: float, stats: dict) -> float:
    z_theta = (log_theta - stats["theta_mean"]) / stats["theta_sd"]
    z_alpha = (log_alpha - stats["alpha_mean"]) / stats["alpha_sd"]
    raw = z_theta - z_alpha
    return float(1.0 / (1.0 + np.exp(-raw)))


def score_session(
    session_csv: str | Path,
    manifest_csv: str | Path,
    stats: dict,
) -> dict[str, float]:
    timestamps, data = load_muse_csv(session_csv)
    elapsed = timestamps - timestamps[0]
    manifest = load_manifest(manifest_csv)
    buckets: dict[str, list[float]] = {row["chunk"]: [] for row in manifest}

    for a, b in _iter_windows(data):
        feat = _window_features(data[a:b])
        if feat is None:
            continue
        mid_s = float(elapsed[(a + b) // 2])
        e = _encoding_index(feat[0], feat[1], stats)
        for row in manifest:
            if row["start_s"] <= mid_s < row["end_s"]:
                buckets[row["chunk"]].append(e)
                break

    scored = {}
    for row in manifest:
        vals = buckets[row["chunk"]]
        if len(vals) >= MIN_WINDOWS:
            scored[row["chunk"]] = float(np.mean(vals))
    return scored
