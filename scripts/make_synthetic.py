#!/usr/bin/env python3
"""
Synthetic Muse EEG generator for Engram.

Produces three CSVs matching muselsl's `record` output format:
  columns: timestamps, TP9, AF7, AF8, TP10, Right AUX
  256 Hz sampling.

The neural model mirrors the real encoding index:
  - frontal channels (AF7/AF8) carry THETA (4-8 Hz) that RISES during
    well-encoded passages
  - posterior channels (TP9/TP10) carry ALPHA (8-13 Hz) that DESYNCHRONIZES
    (drops in power) during well-encoded passages
Each reading session is divided into labelled chunks. Some chunks are
"high-encoding" (strong theta, suppressed alpha), some "low-encoding"
(weak theta, high alpha), some middling -> this is the contrast that keeps
the signal from looking flat/broken.

A few realistic artifacts (occasional blinks on frontal channels) are
injected so your >150 uV peak-to-peak rejection has something to reject.

Output columns and dtypes are chosen to load cleanly with:
  pd.read_csv(path)  ->  same shape muselsl gives you.
"""

import numpy as np
import pandas as pd
import time

FS = 256                      # Hz, Muse EEG rate
CH = ["TP9", "AF7", "AF8", "TP10", "Right AUX"]
RNG = np.random.default_rng(42)   # deterministic so your demo is reproducible

# ----------------------------------------------------------------------
# per-chunk "encoding level": 1.0 = strongly encoded, 0.0 = not encoded.
# these drive theta up / alpha down. Middling values give a realistic spread.
# ----------------------------------------------------------------------

def make_bandpass_noise(n, fs, f_lo, f_hi, amp):
    """Band-limited oscillatory signal via filtered white noise (cheap, no scipy needed)."""
    # white noise
    x = RNG.standard_normal(n)
    # FFT, zero out-of-band, invert -> band-limited noise
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / fs)
    mask = (freqs >= f_lo) & (freqs <= f_hi)
    X[~mask] = 0
    y = np.fft.irfft(X, n=n)
    # normalize to unit std then scale
    s = y.std()
    if s > 0:
        y = y / s
    return y * amp


def pink_background(n, amp):
    """1/f-ish background so the trace looks like real EEG, not a pure sinusoid."""
    x = RNG.standard_normal(n)
    X = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / FS)
    freqs[0] = freqs[1]
    X = X / np.sqrt(freqs)
    y = np.fft.irfft(X, n=n)
    s = y.std()
    if s > 0:
        y = y / s
    return y * amp


def synth_chunk(dur_s, enc):
    """
    Build one chunk of EEG for all four channels given an encoding level `enc` in [0,1].
    Returns array shape (n_samples, 4) for TP9, AF7, AF8, TP10.
    """
    n = int(dur_s * FS)

    # --- theta (frontal): amplitude scales UP with encoding ---
    theta_amp = 6.0 + 14.0 * enc          # ~6uV (low) .. ~20uV (high)
    # --- alpha (posterior): amplitude scales DOWN with encoding (desync) ---
    alpha_amp = 22.0 - 15.0 * enc         # ~22uV (low enc = high alpha) .. ~7uV (high enc)

    # frontal channels: theta-dominant, small alpha leak
    af7 = (pink_background(n, 8.0)
           + make_bandpass_noise(n, FS, 4, 8, theta_amp)
           + make_bandpass_noise(n, FS, 8, 13, 3.0))
    af8 = (pink_background(n, 8.0)
           + make_bandpass_noise(n, FS, 4, 8, theta_amp * 0.95)
           + make_bandpass_noise(n, FS, 8, 13, 3.0))

    # posterior channels: alpha-dominant, small theta leak
    tp9 = (pink_background(n, 8.0)
           + make_bandpass_noise(n, FS, 8, 13, alpha_amp)
           + make_bandpass_noise(n, FS, 4, 8, 3.0))
    tp10 = (pink_background(n, 8.0)
            + make_bandpass_noise(n, FS, 8, 13, alpha_amp * 0.95)
            + make_bandpass_noise(n, FS, 4, 8, 3.0))

    data = np.stack([tp9, af7, af8, tp10], axis=1)

    # --- inject occasional blink artifacts on frontal channels (AF7/AF8 = idx 1,2) ---
    # blinks are big (>150uV p2p) slow deflections -> your downstream rejection catches these
    n_blinks = RNG.poisson(dur_s / 8.0)   # ~one blink per 8s
    for _ in range(n_blinks):
        c = RNG.integers(0, n - FS)
        width = int(0.2 * FS)             # ~200ms
        t = np.arange(width)
        blink = 180.0 * np.exp(-0.5 * ((t - width/2) / (width/6))**2)
        data[c:c+width, 1] += blink
        data[c:c+width, 2] += blink * 0.9

    return data


def build_session(chunk_specs):
    """
    chunk_specs: list of (label, dur_s, enc)
    Returns DataFrame in muselsl record format + a chunk-boundary manifest.
    """
    all_rows = []
    manifest = []
    t0 = time.time()
    elapsed = 0.0
    for label, dur_s, enc in chunk_specs:
        block = synth_chunk(dur_s, enc)
        n = block.shape[0]
        start_idx = len(all_rows)
        # right AUX: just low-amplitude noise, muselsl includes it, pipeline ignores it
        aux = pink_background(n, 5.0).reshape(-1, 1)
        block5 = np.hstack([block, aux])
        all_rows.append(block5)
        manifest.append({
            "chunk": label,
            "enc_level": enc,
            "start_s": round(elapsed, 3),
            "end_s": round(elapsed + dur_s, 3),
        })
        elapsed += dur_s

    data = np.vstack(all_rows)
    n_total = data.shape[0]
    timestamps = t0 + np.arange(n_total) / FS
    df = pd.DataFrame(data, columns=CH)
    df.insert(0, "timestamps", timestamps)
    return df, pd.DataFrame(manifest)


# ----------------------------------------------------------------------
# 1) BASELINE: 60s eyes-open rest. Moderate alpha, low theta, no contrast.
#    enc ~ 0.3 throughout = the neutral reference your z-scores subtract out.
# ----------------------------------------------------------------------
baseline_specs = [("rest", 60, 0.30)]
baseline_df, baseline_manifest = build_session(baseline_specs)

# ----------------------------------------------------------------------
# 2) SEED SESSION: Wikipedia part 1 (intro -> aggregation). Longer.
#    Deliberate contrast across chunks so the model has signal to learn.
# ----------------------------------------------------------------------
seed_specs = [
    ("intro",              30, 0.35),   # easy, washes over -> low encoding
    ("history",            30, 0.55),
    ("document_model",     35, 0.80),   # clicked -> high encoding
    ("bson_types",         30, 0.25),   # dry list -> low
    ("indexing",           35, 0.70),
    ("querying",           30, 0.60),
    ("aggregation",        40, 0.85),   # the good part -> high
]
seed_df, seed_manifest = build_session(seed_specs)

# ----------------------------------------------------------------------
# 3) DEMO SESSION: part 2 (security/locking/Jepsen). Shorter, dense.
#    This is what replays on stage -> strongest contrast, cleanest story.
# ----------------------------------------------------------------------
demo_specs = [
    ("security_intro",     25, 0.45),
    ("authentication",     30, 0.75),   # engaged
    ("authorization",      25, 0.30),   # lost the thread -> low
    ("locking",            30, 0.80),   # dense but landed -> high
    ("replication",        25, 0.40),
    ("jepsen_analysis",    35, 0.88),   # the payoff -> highest
    ("consistency",        25, 0.20),   # faded at the end -> lowest
]
demo_df, demo_manifest = build_session(demo_specs)

# ----------------------------------------------------------------------
# write everything
# ----------------------------------------------------------------------
from pathlib import Path
_ROOT = Path(__file__).resolve().parents[1]
out = _ROOT / "data"
out.mkdir(parents=True, exist_ok=True)

baseline_df.to_csv(f"{out}/baseline.csv", index=False)
seed_df.to_csv(f"{out}/seed_session.csv", index=False)
demo_df.to_csv(f"{out}/demo_session.csv", index=False)

seed_manifest.to_csv(f"{out}/seed_chunks.csv", index=False)
demo_manifest.to_csv(f"{out}/demo_chunks.csv", index=False)

# quick sanity report
for name, df in [("baseline", baseline_df), ("seed", seed_df), ("demo", demo_df)]:
    ch = df[["TP9", "AF7", "AF8", "TP10"]]
    p2p = (ch.max() - ch.min()).round(0).to_dict()
    print(f"{name:9s} rows={len(df):6d} dur={len(df)/FS:6.1f}s "
          f"std={ch.std().round(1).to_dict()} p2p={p2p}")

print("\nseed chunks:")
print(seed_manifest.to_string(index=False))
print("\ndemo chunks:")
print(demo_manifest.to_string(index=False))
