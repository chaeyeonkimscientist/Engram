/**
 * types.ts — the wire contract with the Python backend.
 *
 * These mirror the JSON shapes returned by `engram/api.py`, which in turn reads
 * the Mongo documents written by `scripts/ingest_doc.py`. Field names here match
 * the backend exactly (snake_case) so there is no translation layer to drift.
 */

/** Where a response came from. `mock` means the backend was unreachable. */
export type ResultSource = "live" | "mock";

/**
 * Every client call resolves to one of these — never throws, never rejects.
 * Discriminate on `source` to show an honest indicator in the UI.
 */
export type ApiResult<T> =
  | { source: "live"; data: T }
  | { source: "mock"; data: T; reason: string };

export interface MongoHealth {
  reachable: boolean;
  latency_ms?: number;
  chunks?: number;
  beliefs?: number;
  error?: string;
  message?: string;
}

export interface Health {
  status: "ok" | "degraded";
  db_name: string;
  mongo: MongoHealth;
}

/** One ingested document, for the library screen. */
export interface DocumentSummary {
  doc_id: string;
  title: string;
  chunk_count: number;
  n_chars: number;
  /** Mean P(encoded) across the document's chunks, in [0,1]. */
  retention: number;
  /** Chunks below the 0.4 risk threshold. */
  at_risk_count: number;
  /** Chunks that have at least one piece of recorded evidence. */
  seen_count: number;
}

/** A chunk of a document plus its current belief state. */
export interface Chunk {
  chunk_id: string;
  doc_id: string;
  /** Reading order within the document. */
  ord: number;
  text: string;
  n_chars: number;
  kind: string | null;
  /** P(encoded) in [0,1], decayed to now. */
  p_encoded: number;
  /** Evidence strength in [0,1], for the uncertainty/blur channel. */
  confidence: number;
  alpha: number;
  beta: number;
  half_life: number;
  n_evidence: number;
  has_evidence: boolean;
}

export interface DocumentChunks {
  doc_id: string;
  title: string;
  chunks: Chunk[];
}

/**
 * The result of one evidence event. `p_before`, `p_after` and `delta` are what
 * drive the visible count-up on the quiz overlay.
 */
export interface BeliefUpdate {
  chunk_id: string;
  doc_id: string | null;
  ord: number | null;
  p_before: number;
  p_after: number;
  /** Signed contribution, `p_after - p_before`. */
  delta: number;
  alpha: number;
  beta: number;
  half_life: number;
  confidence: number;
  n_evidence: number;
  /** The semantic-correctness score that was applied, in [0,1]. */
  s: number;
  /** The evidence weight that was applied. */
  w: number;
  event: "dwell" | "answer";
}
