from engram.config import (
    HALF_LIFE_GROW_BASE,
    HALF_LIFE_GROW_WEIGHT,
    HALF_LIFE_MIN_H,
    HALF_LIFE_SHRINK,
    KAPPA,
    RECALL_GROW_S,
    RECALL_SHRINK_S,
    SELECT_K,
)


def prior_from_index(e: float) -> tuple[float, float]:
    alpha0 = 1.0 + KAPPA * e
    beta0 = 1.0 + KAPPA * (1.0 - e)
    return alpha0, beta0


def update(alpha: float, beta: float, s: float, w: float) -> tuple[float, float]:
    alpha = alpha + w * s
    beta = beta + w * (1.0 - s)
    return alpha, beta


def decay(
    alpha: float,
    beta: float,
    alpha0: float,
    beta0: float,
    hours_since: float,
    half_life: float,
) -> float:
    lam = 0.5 ** (hours_since / half_life)
    alpha_eff = alpha0 + lam * (alpha - alpha0)
    beta_eff = beta0 + lam * (beta - beta0)
    return alpha_eff / (alpha_eff + beta_eff)


def adjust_half_life(half_life: float, s: float) -> float:
    if s >= RECALL_GROW_S:
        half_life *= HALF_LIFE_GROW_BASE + HALF_LIFE_GROW_WEIGHT * s
    if s < RECALL_SHRINK_S:
        half_life = max(HALF_LIFE_MIN_H, half_life * HALF_LIFE_SHRINK)
    return half_life


def select_lowest(chunks: list[dict], k: int | None = None) -> list[dict]:
    if k is None:
        k = SELECT_K

    def sort_key(chunk: dict) -> tuple[float, int]:
        p_encoded = decay(
            chunk["alpha"],
            chunk["beta"],
            chunk["alpha0"],
            chunk["beta0"],
            chunk["hours_since"],
            chunk["half_life"],
        )
        return (p_encoded, -chunk["n_chars"])

    return sorted(chunks, key=sort_key)[:k]
