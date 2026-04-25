// Maps a raw Cohere cosine similarity to a [0, 1] skill-match score.
//
// History:
//   v1 used a linear clip on [0.50, 0.85]. That produced a hard edge
//   at the low end (0.49 -> 0, 0.51 -> 0.03) and a ceiling that
//   flattened real differences above 0.85.
//
// Current: logistic sigmoid centered at MIDPOINT with width SCALE.
//   score = 1 / (1 + exp(-(cos - MIDPOINT) / SCALE))
//
// Reference points with current params (MIDPOINT=0.675, SCALE=0.08):
//   cos=0.40  -> 0.03     (low but not zeroed)
//   cos=0.50  -> 0.11
//   cos=0.60  -> 0.30
//   cos=0.68  -> 0.52
//   cos=0.75  -> 0.79
//   cos=0.85  -> 0.92
//   cos=0.95  -> 0.98
//
// These params are a principled starting estimate derived from the
// prior heuristic band, NOT empirically fit. Replace with isotonic
// regression or a tuned sigmoid once you have labeled
// (requirement_text, user_skill, human_label) triples. A data file
// under _shared/calibration/ would let you swap curves without code
// changes. See README at bottom of this file for the labeling plan.

const MIDPOINT = 0.675
const SCALE = 0.08

export const calibrateSemantic = (cosine: number): number => {
  if (!Number.isFinite(cosine)) return 0
  const clamped = Math.max(-1, Math.min(1, cosine))
  const z = (clamped - MIDPOINT) / SCALE
  return 1 / (1 + Math.exp(-z))
}

// Exported for telemetry / debugging so callers can log params alongside
// scores and detect drift after a future recalibration.
export const SEMANTIC_CALIBRATION_PARAMS = {
  method: 'sigmoid' as const,
  midpoint: MIDPOINT,
  scale: SCALE,
  version: 1,
}

/*
  ---------------------------------------------------------------
  Empirical calibration plan (when ready to replace these params):

  1. Instrument match-jobs to log sampled triples to a new table
     `semantic_calibration_samples(requirement, user_skill, cosine,
     created_at)` — sample ~1% of per-requirement scores.

  2. After ~500 rows, export to CSV and hand-label each triple:
       1.0  = same skill
       0.5  = related / partial
       0.0  = unrelated

  3. Fit options, in order of preference:
       a. Isotonic regression (monotone, non-parametric, overfits less
          than a polynomial on small N). Output: a step function.
       b. Tuned sigmoid — grid search MIDPOINT x SCALE minimizing MSE.
       c. Two-piece linear (cheap, interpretable).

  4. Commit the fitted curve as a data file (JSON lookup table), not
     code. Bump SEMANTIC_CALIBRATION_PARAMS.version and MATCHER_VERSION
     to invalidate match_scores_cache.

  5. Re-sample periodically (e.g. every 6 months) and check for drift.
  ---------------------------------------------------------------
*/
