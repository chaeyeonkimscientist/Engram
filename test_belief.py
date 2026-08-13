from engram import belief as b
from engram.config import HALF_LIFE_MIN_H


def test_kappa_zero_collapses_to_flat_prior(monkeypatch):
    monkeypatch.setattr(b, "KAPPA", 0.0)
    assert b.prior_from_index(0.0) == (1.0, 1.0)
    assert b.prior_from_index(0.73) == (1.0, 1.0)
    assert b.prior_from_index(1.0) == (1.0, 1.0)


def test_encoding_index_tilts_prior():
    hi_a, hi_b = b.prior_from_index(1.0)
    lo_a, lo_b = b.prior_from_index(0.0)
    assert hi_a > hi_b
    assert lo_b > lo_a


def test_correct_raises_wrong_lowers_p_encoded():
    a0, b0 = b.prior_from_index(0.5)
    p0 = a0 / (a0 + b0)
    up_a, up_b = b.update(a0, b0, s=1.0, w=1.0)
    dn_a, dn_b = b.update(a0, b0, s=0.0, w=1.0)
    assert up_a / (up_a + up_b) > p0
    assert dn_a / (dn_a + dn_b) < p0


def test_hesitant_correct_raises_less_than_confident():
    a0, b0 = 2.0, 2.0
    conf_a, conf_b = b.update(a0, b0, s=1.0, w=1.0)
    hes_a, hes_b = b.update(a0, b0, s=1.0, w=0.4)
    assert hes_a / (hes_a + hes_b) < conf_a / (conf_a + conf_b)


def test_decay_zero_hours_is_undecayed_posterior():
    assert b.decay(3.0, 1.0, 1.0, 1.0, hours_since=0.0, half_life=72.0) == 0.75


def test_decay_one_half_life_moves_halfway_toward_prior():
    p = b.decay(3.0, 1.0, 1.0, 1.0, hours_since=72.0, half_life=72.0)
    alpha_eff = 1.0 + 0.5 * (3.0 - 1.0)
    beta_eff = 1.0 + 0.5 * (1.0 - 1.0)
    assert p == alpha_eff / (alpha_eff + beta_eff)
    assert 0.5 < p < 0.75


def test_adjust_half_life_grows_on_success_shrinks_on_fail():
    assert b.adjust_half_life(72.0, 0.7) > 72.0
    assert b.adjust_half_life(72.0, 0.3) < 72.0
    assert b.adjust_half_life(30.0, 0.0) == HALF_LIFE_MIN_H
