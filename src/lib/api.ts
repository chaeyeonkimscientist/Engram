/**
 * api.ts — the only door to the Python backend.
 *
 * STAGE SAFETY IS THE CONTRACT. Every function here resolves; none of them
 * reject. If the API is down, Mongo is unreachable, or the network is slow, the
 * call degrades to a pre-recorded fixture and reports `source: "mock"` so the UI
 * can show a small honest indicator instead of white-screening mid-demo.
 *
 * Usage:
 *
 *   const { data, source } = await getDocuments();
 *   // render data; if source === "mock", show the fallback dot
 *
 * The belief model itself lives in Python (`engram/belief.py`). Nothing in this
 * file computes a posterior — the mock path replays plausible recorded values.
 */

import type {
  ApiResult,
  BeliefUpdate,
  Chunk,
  DocumentChunks,
  DocumentSummary,
  Health,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_ENGRAM_API_URL ?? "http://localhost:8000";

/** A slow backend must degrade rather than hang the reader. */
const TIMEOUT_MS = 2000;

const live = <T>(data: T): ApiResult<T> => ({ source: "live", data });
const mock = <T>(data: T, reason: string): ApiResult<T> => ({
  source: "mock",
  data,
  reason,
});

/**
 * Fetch with a hard timeout. Returns the parsed body, or a reason string
 * describing why the live call could not be used. Never throws.
 */
async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, reason: `backend returned ${response.status}` };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === "AbortError"
        ? `backend did not answer within ${TIMEOUT_MS}ms`
        : `backend unreachable: ${error instanceof Error ? error.message : String(error)}`;
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getHealth(): Promise<ApiResult<Health>> {
  const result = await request<Health>("/health");
  return result.ok ? live(result.data) : mock(MOCK_HEALTH, result.reason);
}

export async function getDocuments(): Promise<ApiResult<DocumentSummary[]>> {
  const result = await request<{ documents: DocumentSummary[] }>("/documents");
  if (!result.ok) return mock(MOCK_DOCUMENTS, result.reason);
  // An empty live library is indistinguishable from a broken demo on stage, so
  // fall back to fixtures when nothing has been ingested yet.
  if (!result.data.documents?.length) {
    return mock(MOCK_DOCUMENTS, "backend has no ingested documents");
  }
  return live(result.data.documents);
}

export async function getDocumentChunks(
  docId: string,
): Promise<ApiResult<DocumentChunks>> {
  const result = await request<DocumentChunks>(
    `/documents/${encodeURIComponent(docId)}/chunks`,
  );
  if (!result.ok) return mock(mockChunksFor(docId), result.reason);
  if (!result.data.chunks?.length) {
    return mock(mockChunksFor(docId), "document has no chunks");
  }
  return live(result.data);
}

// ---------------------------------------------------------------------------
// Writes — evidence events
// ---------------------------------------------------------------------------

/** The dwell gate fired on a chunk. Weak positive evidence. */
export async function recordDwell(
  chunkId: string,
  seconds?: number,
): Promise<ApiResult<BeliefUpdate>> {
  const result = await request<BeliefUpdate>(
    `/chunks/${encodeURIComponent(chunkId)}/dwell`,
    { method: "POST", body: JSON.stringify({ seconds: seconds ?? null }) },
  );
  return result.ok
    ? live(result.data)
    : mock(mockUpdate(chunkId, 1, 0.35, "dwell"), result.reason);
}

/**
 * A graded quiz answer.
 *
 * @param score      semantic correctness in [0,1]
 * @param confidence evidence weight; 1 is a normal answer
 */
export async function recordAnswer(
  chunkId: string,
  score: number,
  confidence = 1,
): Promise<ApiResult<BeliefUpdate>> {
  const s = Math.min(1, Math.max(0, score));
  const result = await request<BeliefUpdate>(
    `/chunks/${encodeURIComponent(chunkId)}/answer`,
    { method: "POST", body: JSON.stringify({ score: s, confidence }) },
  );
  return result.ok
    ? live(result.data)
    : mock(mockUpdate(chunkId, s, confidence, "answer"), result.reason);
}

// ---------------------------------------------------------------------------
// Fixtures
//
// These mirror the live response shapes exactly. Belief values are spread across
// the full range, including several below the 0.4 risk threshold, so passage
// tinting and lattice density are visibly exercised without a backend.
// ---------------------------------------------------------------------------

export const MOCK_HEALTH: Health = {
  status: "degraded",
  db_name: "engram",
  mongo: { reachable: false, error: "Unreachable", message: "using fixtures" },
};

export const MOCK_DOCUMENTS: DocumentSummary[] = [
  {
    doc_id: "mongodb-part1",
    title: "Mongodb Part1",
    chunk_count: 8,
    n_chars: 5120,
    retention: 0.58,
    at_risk_count: 3,
    seen_count: 8,
  },
  {
    doc_id: "mongodb-part2",
    title: "Mongodb Part2",
    chunk_count: 6,
    n_chars: 3840,
    retention: 0.34,
    at_risk_count: 4,
    seen_count: 5,
  },
];

const MOCK_TEXT: readonly string[] = [
  "A document database stores data in flexible, JSON-like documents, meaning fields can vary from document to document and the data structure can change over time. Documents map naturally to the objects in your application code, which makes the data easier to work with.",
  "Collections are analogous to tables in a relational database, but they do not enforce a schema by default. Two documents in the same collection may have entirely different fields, which is what makes iterative development fast — you add a field where you need it and old documents remain valid.",
  "An index is a data structure that stores a small portion of the collection's data in an easy-to-traverse form. Without an index, MongoDB must perform a collection scan, examining every document to select those that match the query statement.",
  "Compound indexes hold references to multiple fields, and the order of those fields matters. A compound index on (userId, createdAt) can serve a query that filters on userId alone, but not one that filters only on createdAt — the prefix rule.",
  "The aggregation pipeline is a framework for data transformation. Documents enter a multi-stage pipeline where each stage transforms them and passes the results to the next. Stages like $match and $sort can use indexes when they appear at the start of the pipeline.",
  "Atlas Vector Search indexes embeddings alongside your operational data, so semantic retrieval and ordinary queries hit the same documents. A vectorSearch index declares the path to the embedding, the number of dimensions, and the similarity function.",
  "Replica sets provide redundancy and high availability. A primary receives all write operations while secondaries replicate the primary's oplog and apply the operations to their own data sets. If the primary becomes unavailable, an election picks a new one.",
  "Sharding distributes data across multiple machines to support very large data sets and high throughput. The shard key determines how documents are partitioned, and a poorly chosen shard key concentrates traffic on a single shard — the classic hotspot.",
];

/** A deliberate spread: several at-risk, several mid-forming, a couple encoded. */
const MOCK_P: readonly number[] = [0.91, 0.28, 0.64, 0.17, 0.79, 0.36, 0.52, 0.88];
const MOCK_CONFIDENCE: readonly number[] = [1, 0.55, 0.8, 0.3, 0.95, 0.45, 0.7, 1];

function mockChunk(docId: string, ord: number): Chunk {
  const p = MOCK_P[ord % MOCK_P.length];
  const confidence = MOCK_CONFIDENCE[ord % MOCK_CONFIDENCE.length];
  // Beta parameters consistent with the quoted posterior mean, so the inspector
  // shows numbers that agree with the P value.
  const mass = 2 + 6 * confidence;
  return {
    chunk_id: `${docId}:${ord}`,
    doc_id: docId,
    ord,
    text: MOCK_TEXT[ord % MOCK_TEXT.length],
    n_chars: MOCK_TEXT[ord % MOCK_TEXT.length].length,
    kind: null,
    p_encoded: p,
    confidence,
    alpha: Math.round(mass * p * 100) / 100,
    beta: Math.round(mass * (1 - p) * 100) / 100,
    half_life: 72,
    n_evidence: Math.max(1, Math.round(confidence * 4)),
    has_evidence: true,
  };
}

export function mockChunksFor(docId: string): DocumentChunks {
  const count = docId === "mongodb-part2" ? 6 : 8;
  return {
    doc_id: docId,
    title: docId.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    chunks: Array.from({ length: count }, (_, ord) => mockChunk(docId, ord)),
  };
}

export const MOCK_CHUNKS: DocumentChunks = mockChunksFor("mongodb-part1");

/**
 * A plausible pre-recorded evidence result for the offline path.
 *
 * This is a replayed animation value, NOT the belief model — the real posterior
 * is computed by `engram/belief.py` on the server. It moves P toward the score
 * by an amount proportional to the evidence weight so the count-up still reads
 * correctly on stage, and remembers the new value so repeated interactions in a
 * single demo look continuous.
 */
const mockBeliefState = new Map<string, number>();

function mockUpdate(
  chunkId: string,
  s: number,
  w: number,
  event: "dwell" | "answer",
): BeliefUpdate {
  const ord = Number.parseInt(chunkId.split(":").pop() ?? "", 10);
  const seed = Number.isNaN(ord) ? 0.5 : MOCK_P[ord % MOCK_P.length];
  const pBefore = mockBeliefState.get(chunkId) ?? seed;
  const pAfter = Math.min(0.99, Math.max(0.01, pBefore + (s - pBefore) * 0.28 * w));
  mockBeliefState.set(chunkId, pAfter);

  const mass = 4 + 2 * w;
  return {
    chunk_id: chunkId,
    doc_id: chunkId.includes(":") ? chunkId.split(":")[0] : null,
    ord: Number.isNaN(ord) ? null : ord,
    p_before: pBefore,
    p_after: pAfter,
    delta: pAfter - pBefore,
    alpha: Math.round(mass * pAfter * 100) / 100,
    beta: Math.round(mass * (1 - pAfter) * 100) / 100,
    half_life: s >= 0.7 ? 100.8 : 72,
    confidence: Math.min(1, 0.4 + 0.3 * w),
    n_evidence: 1,
    s,
    w,
    event,
  };
}

/** Clears remembered mock belief values. Useful between demo runs. */
export function resetMockState(): void {
  mockBeliefState.clear();
}
