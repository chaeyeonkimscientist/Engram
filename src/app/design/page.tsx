"use client";

/**
 * /design — the Engram design system showcase.
 *
 * Structure ported from reference/engram-identity.html; copy rewritten for the
 * real product; sections 05+ replaced with the actual Engram primitives. All
 * sample content lives here, never inside the components.
 */

import { useEffect, useState } from "react";
import {
  MOCK_CHUNKS,
  MOCK_DOCUMENTS,
  getDocumentChunks,
  getDocuments,
  recordAnswer,
} from "@/lib/api";
import type { Chunk, DocumentSummary, ResultSource } from "@/lib/types";
import { SourceTag } from "@/components/engram/SourceTag";
import { Cap, SectionHead } from "@/components/engram/Cap";
import { Grain } from "@/components/engram/Grain";
import { Mark, Wordmark } from "@/components/engram/Mark";
import { MarkStage } from "@/components/engram/MarkStage";
import { AgentOrb, SpeakingPill, type OrbState } from "@/components/engram/AgentOrb";
import { Passage, ReadingColumn } from "@/components/engram/Reader";
import { CountingP, DeltaChip } from "@/components/engram/BeliefValue";
import {
  BeliefDrawer,
  BeliefStrip,
  ContributionBreakdown,
  type BeliefEvent,
  type ChunkBelief,
  type Contribution,
} from "@/components/engram/BeliefInspector";
import { QuizOverlay, ReaderScrim } from "@/components/engram/QuizOverlay";
import { DocumentRow, IngestCTA, ProfileCard, RetentionMark } from "@/components/engram/Library";
import { beliefVisual, RISK_THRESHOLD } from "@/lib/belief";

/* ------------------------------------------------------------------ sample data */

const RAMP_STOPS = [
  ["Bone", "#EFEFEC"],
  ["Haze", "#DCE2E0"],
  ["Slate", "#8A9A9B"],
  ["Moss", "#5A6A6B"],
  ["Deep", "#2A3A3D"],
  ["Void", "#0B1113"],
] as const;

const PASSAGES = [
  {
    p: 0.88,
    text: "Long-term potentiation was first described in the rabbit hippocampus: brief high-frequency stimulation of the perforant path produced a lasting increase in the response of granule cells.",
  },
  {
    p: 0.62,
    text: "The effect persisted for hours, which distinguished it from the short-lived facilitation already known at the neuromuscular junction, and it was specific to the stimulated pathway.",
  },
  {
    p: 0.24,
    confidence: 0.9,
    text: "Consolidation is the term for the process by which a labile trace becomes resistant to interference. It is defined operationally — by what disrupts it and when — rather than by a single molecular event.",
  },
  {
    p: 0.35,
    confidence: 0.3,
    text: "Reconsolidation complicates the picture: a retrieved memory can return to a labile state, so the trace is not written once but repeatedly re-stabilised.",
  },
];

const EVENTS: BeliefEvent[] = [
  { at: "00:12:41", kind: "prior ingested — 4ch, snr 0.31", chunk: "c-14" },
  { at: "00:12:44", kind: "dwell gate fired (3.0s)", chunk: "c-14", delta: -0.08 },
  { at: "00:13:02", kind: "question queued at paragraph boundary", chunk: "c-14" },
  { at: "00:13:19", kind: "spoken answer graded — hedged", chunk: "c-14", delta: 0.12 },
  { at: "00:13:20", kind: "posterior written to mongodb", chunk: "c-14" },
];

const CHUNKS: ChunkBelief[] = [
  { id: "c-12", excerpt: "Long-term potentiation was first…", p: 0.88 },
  { id: "c-13", excerpt: "The effect persisted for hours…", p: 0.62 },
  { id: "c-14", excerpt: "Consolidation is the term for…", p: 0.24, confidence: 0.9 },
  { id: "c-15", excerpt: "Reconsolidation complicates…", p: 0.35, confidence: 0.3 },
];

const CONTRIBUTIONS: Contribution[] = [
  { source: "prior", detail: "encoding index 0.28 · snr 0.31", delta: -0.08 },
  { source: "quiz", detail: "partial credit 0.5 · c-14", delta: 0.06 },
  { source: "voice", detail: "hedged · 2.4s to first word", delta: 0.12 },
];

const docMeta = (d: DocumentSummary) =>
  `${d.chunk_count} chunks · ${d.at_risk_count} at risk · ${d.seen_count} seen`;

const ORB_STATES: { state: OrbState; label: string; note: string }[] = [
  { state: "idle", label: "idle", note: "40% · still. Watching, no ask." },
  { state: "thinking", label: "thinking", note: "60% · slow pulse. Dwell gate fired, belief updated." },
  {
    state: "wants-to-speak",
    label: "wants to speak",
    note: "100% · bloom outward. Question queued, waiting for a paragraph boundary.",
  },
  { state: "speaking", label: "speaking", note: "Expands into a pill. Waveform, transcript, cited posterior." },
];

const NAV = [
  ["#top", "Engram"],
  ["#mark", "Mark"],
  ["#field", "Field"],
  ["#type", "Type"],
  ["#surfaces", "Surfaces"],
  ["#reader", "Reader"],
  ["#orb", "Orb"],
  ["#quiz", "Quiz"],
  ["#library", "Library"],
] as const;

/* ------------------------------------------------------------------ page */

export default function DesignPage() {
  const [dwellRunning, setDwellRunning] = useState(false);
  const [orbDemo, setOrbDemo] = useState<OrbState>("wants-to-speak");

  // Live state. Fixtures render first, then whatever the backend says. The
  // client never throws, so there is nothing to catch.
  const [docs, setDocs] = useState<DocumentSummary[]>(MOCK_DOCUMENTS);
  const [docsSource, setDocsSource] = useState<ResultSource>("mock");
  const [chunks, setChunks] = useState<Chunk[]>(MOCK_CHUNKS.chunks);
  const [chunksSource, setChunksSource] = useState<ResultSource>("mock");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const docsResult = await getDocuments();
      if (cancelled) return;
      setDocs(docsResult.data);
      setDocsSource(docsResult.source);

      const first = docsResult.data[0]?.doc_id ?? "mongodb-part1";
      const chunksResult = await getDocumentChunks(first);
      if (cancelled) return;
      setChunks(chunksResult.data.chunks);
      setChunksSource(chunksResult.source);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The reader shows the first four chunks; the quiz targets the weakest one.
  const readerChunks = chunks.slice(0, 4);
  const target = chunks.reduce(
    (lowest, c) => (c.p_encoded < lowest.p_encoded ? c : lowest),
    chunks[0],
  );

  // Quiz: the posterior moves on screen while the agent speaks.
  const [quizP, setQuizP] = useState<number | null>(null);
  const [quizDelta, setQuizDelta] = useState<{ d: number; label: string } | undefined>();
  const [answerSource, setAnswerSource] = useState<ResultSource | null>(null);
  const [listening, setListening] = useState(false);
  const [dimmed, setDimmed] = useState(true);

  const shownP = quizP ?? target?.p_encoded ?? 0.24;

  /** Real evidence event: p_after and delta come from the backend. */
  const answer = async (score: number, weight: number, label: string) => {
    setListening(false);
    if (!target) return;
    const result = await recordAnswer(target.chunk_id, score, weight);
    setQuizP(result.data.p_after);
    setQuizDelta({ d: result.data.delta, label });
    setAnswerSource(result.source);
  };
  const resetQuiz = () => {
    setQuizP(null);
    setQuizDelta(undefined);
    setAnswerSource(null);
  };

  return (
    <>
      <Grain />

      <nav className="nav">
        {NAV.map(([href, label], i) => (
          <a key={href} href={href} className={i === 0 ? "on" : ""}>
            {label}
          </a>
        ))}
      </nav>

      {/* ============================================================ HERO */}
      <header className="hero" id="top">
        <div className="field" />

        <div className="hero-top">
          <div className="hero-wm">
            <Cap className="mb-[1.1rem] block">
              Persistent context — built on MongoDB
            </Cap>
            <h1>Engram</h1>
            <p className="sub">
              A reading companion that models your memory, so the agent never cold-starts you
              again.
            </p>
          </div>
        </div>

        <div className="panels">
          <article className="panel">
            <span className="plabel cap">Read</span>
            <Mark density="sparse" size={56} goo={2.6} className="glyph" />
            <h3>Encode</h3>
            <p>
              A neural prior scores each passage as you read it — gated on dwell, so transitions
              and backtracks are discarded.
            </p>
          </article>
          <article className="panel panel-tall">
            <span className="plabel cap">Fuse</span>
            <Mark density="dense" size={56} goo={2.6} className="glyph" />
            <h3>Believe</h3>
            <p>
              The prior fuses with quiz outcomes and spoken-answer confidence into one number per
              chunk: P(encoded), stored in MongoDB.
            </p>
          </article>
          <article className="panel">
            <span className="plabel cap">Return</span>
            <Mark density="linked" size={56} goo={2.6} className="glyph" />
            <h3>Resurface</h3>
            <p>
              The agent quizzes the lowest-belief chunks first, and brings back what you are about
              to forget.
            </p>
          </article>
        </div>
      </header>

      {/* ============================================================ 01 MARK */}
      <section className="sec dark" id="mark">
        <div className="wrap">
          <SectionHead
            kicker="01 — The mark"
            title="Density is the belief."
            note="Not four marks. One mark at four densities. Isolated points fuse as memories consolidate, so the identity reports the state of the reader."
          />
          <MarkStage />

          <div className="mt-12 grid gap-6 md:grid-cols-[1fr_auto]">
            <p className="desc" style={{ maxWidth: "46ch" }}>
              In the product the density is not chosen — it is computed.{" "}
              <code style={{ fontFamily: "var(--mono)", fontSize: "var(--t--1)" }}>
                beliefVisual(p)
              </code>{" "}
              interpolates continuously between the four parameter sets, so a chunk at 0.63 has its
              own density. Every belief surface in the system reads from that one function.
            </p>
            <div className="flex items-end gap-5">
              {[0, 0.33, 0.66, 1].map((p) => (
                <div key={p} className="flex flex-col items-center gap-2">
                  <Mark density={p} size={54} goo={2.6} fill="var(--bone)" />
                  <Cap style={{ color: "var(--slate)" }}>P {p.toFixed(2)}</Cap>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <Cap style={{ color: "var(--slate)" }}>
              Confidence is the second axis — soft goo means the estimate is not yet claimed
            </Cap>
            <div className="mt-4 flex flex-wrap items-end gap-7">
              {[0.15, 0.45, 0.75, 1].map((c) => {
                const v = beliefVisual(0.62, c);
                return (
                  <div key={c} className="flex flex-col items-center gap-2">
                    <Mark density={0.62} size={54} goo={v.goo} fill="var(--bone)" />
                    <Cap style={{ color: "var(--slate)" }}>conf {c.toFixed(2)}</Cap>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ 02 FIELD */}
      <section className="sec" id="field">
        <div className="wrap">
          <SectionHead
            kicker="02 — The field"
            title="One gradient, no accent."
            note="Colour runs as a single atmospheric ramp from haze to void. Nothing bright is allowed in; emphasis comes from depth and contrast instead."
          />

          <div className="ramp" />

          <div className="stops">
            {RAMP_STOPS.map(([name, hex]) => (
              <div className="stop" key={hex}>
                <div className="sw" style={{ background: hex }} />
                <div className="nm">{name}</div>
                <div className="hx">{hex}</div>
              </div>
            ))}
          </div>

          <p className="norule">
            <strong>The one rule:</strong> if something needs to stand out, move it along the ramp —
            don&apos;t colour it. A live state is Void on Bone, never a hue.
          </p>

          {/* The one deliberate deviation. Documented, and behind one token. */}
          <div
            className="mt-8 flex flex-wrap items-center gap-5 p-5"
            style={{ border: "1px solid var(--hair)", borderRadius: "var(--r)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="block h-11 w-11 rounded-lg"
                style={{ background: "var(--risk)", border: "1px solid var(--hair)" }}
              />
              <div>
                <div className="nm" style={{ fontSize: "var(--t--1)" }}>
                  Clay
                </div>
                <div className="hx" style={{ fontFamily: "var(--mono)", fontSize: "var(--t--2)", color: "var(--moss)" }}>
                  #9C8467
                </div>
              </div>
            </div>
            <p className="norule" style={{ margin: 0, maxWidth: "58ch" }}>
              <strong>The accent budget, spent once.</strong> One desaturated clay, luminance-matched
              to slate so it never reads bright, reserved solely for the at-risk tail
              (P &lt; {RISK_THRESHOLD}). Judges must be able to see risk at a glance on a projector.
              Nothing else in the system may use it, and{" "}
              <code style={{ fontFamily: "var(--mono)", fontSize: "var(--t--2)" }}>--risk</code>{" "}
              removes it in one line.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ 03 TYPE */}
      <section className="sec" id="type" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="wrap">
          <SectionHead
            kicker="03 — Type"
            title="Two voices."
            note="Inter Tight set very tight for anything a person reads. Martian Mono, only ever small and tracked out, for anything the machine reports."
          />

          <div className="trow">
            <div className="m">
              Display
              <br />
              Inter Tight 500 · −5%
            </div>
            <div className="d1">Engram</div>
          </div>
          <div className="trow">
            <div className="m">
              Lead
              <br />
              Inter Tight 500 · −2%
            </div>
            <div className="d2">Memory that changes what the agent asks next.</div>
          </div>
          <div className="trow">
            <div className="m">
              Body
              <br />
              Inter Tight 400
            </div>
            <div className="d3">
              Engram chunks a document, scores how well each passage lands from a low-SNR neural
              prior, then fuses that prior with quiz outcomes and spoken-answer confidence into one
              belief per chunk in MongoDB. The belief has to change what the agent asks next —
              otherwise it is just telemetry.
            </div>
          </div>
          <div className="trow" style={{ border: 0 }}>
            <div className="m">
              Readout
              <br />
              Martian Mono 300 · +16%
            </div>
            <div className="d4">
              P(encoded) 0.24 · dwell 3.0s · prior snr 0.31 · 4 chunks below threshold
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ 04 SURFACES */}
      <section className="sec" id="surfaces" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="wrap">
          <SectionHead
            kicker="04 — Surfaces"
            title="Panels float. Rules don't."
            note="Cards lift off the field with blur and a long soft shadow. Borders stay hairline; radius stays generous and consistent at 24px."
          />

          <div className="surf">
            <div className="tile">
              <span className="cap">Pills</span>
              <span className="pill solid">
                <span className="bit" />
                Prior live
              </span>
              <span className="pill">dwell 3.0s</span>
              <span className="pill">snr 0.31</span>
              <span className="pill">24 chunks</span>
            </div>
            <div className="tile">
              <span className="cap">Readout</span>
              <div className="stat">
                <span>Chunks scored</span>
                <span>142</span>
              </div>
              <div className="stat">
                <span>Mean P(encoded)</span>
                <span>0.61</span>
              </div>
              <div className="stat">
                <span>Below threshold</span>
                <span>18</span>
              </div>
              <div className="stat">
                <span>Cold starts</span>
                <span>0</span>
              </div>
            </div>
            <div className="tile">
              <span className="cap">Retention marks</span>
              <div className="flex flex-wrap items-center gap-4">
                {[0.93, 0.62, 0.35, 0.18].map((p) => (
                  <RetentionMark key={p} p={p} size={40} />
                ))}
              </div>
              <div className="mt-5">
                <span className="cap">Contribution breakdown</span>
                <div className="mt-2">
                  <ContributionBreakdown contributions={CONTRIBUTIONS} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ 05 READER */}
      <section className="sec" id="reader" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="wrap">
          <SectionHead
            kicker="05 — The reader"
            title="It shows its belief."
            note="The column stays quiet. The wash is the ambient signal, the rail is the dwell gate, the orb offers and never interrupts, and the strip holds the number."
          />

          <div className="app">
            <div className="app-bar">
              <Mark density="dense" size={22} goo={2.2} />
              <span className="p">
                {(docs[0]?.title ?? "SESSION").toUpperCase()} ·{" "}
                {docs[0]?.chunk_count ?? readerChunks.length} CHUNKS · DWELL GATE 3.0S
              </span>
              <span className="ml-auto">
                <SourceTag source={chunksSource} />
              </span>
            </div>

            <div className="flex">
              <div className="min-w-0 flex-1 p-8">
                <ReadingColumn>
                  {readerChunks.map((c, i) => (
                    <Passage
                      key={c.chunk_id}
                      p={c.p_encoded}
                      confidence={c.confidence}
                      current={i === 2}
                      dwell={i === 2 ? 0.55 : undefined}
                      dwellRunning={i === 2 && dwellRunning}
                      dwellState={i === 2 ? "counting" : "idle"}
                      showValue
                    >
                      {c.text}
                    </Passage>
                  ))}
                </ReadingColumn>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    className="pill cursor-pointer"
                    onClick={() => {
                      setDwellRunning(false);
                      requestAnimationFrame(() => setDwellRunning(true));
                    }}
                  >
                    <span className="bit" />
                    Run the dwell gate
                  </button>
                  <AgentOrb state="wants-to-speak" />
                </div>
              </div>

              <BeliefStrip
                p={readerChunks[2]?.p_encoded ?? 0.24}
                confidence={readerChunks[2]?.confidence ?? 0.9}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_360px]">
            <div
              className="p-6"
              style={{ border: "1px solid var(--hair)", borderRadius: "var(--r)", background: "#F5F5F2" }}
            >
              <span className="cap">Passage tint — the whole ramp</span>
              <div className="mt-4">
                <ReadingColumn>
                  {[0.95, 0.72, 0.5, 0.32, 0.12].map((p) => (
                    <Passage key={p} p={p} showValue>
                      Consolidation is the term for the process by which a labile trace becomes
                      resistant to interference.
                    </Passage>
                  ))}
                </ReadingColumn>
              </div>
              <p className="norule">
                Encoded chunks get nothing at all — clean bone. Under-encoded chunks sit deeper on
                the ramp. Only the at-risk tail spends the accent.
              </p>
            </div>

            <BeliefDrawer
              p={0.24}
              confidence={0.9}
              events={EVENTS}
              chunks={CHUNKS}
              contributions={CONTRIBUTIONS}
            />
          </div>
        </div>
      </section>

      {/* ============================================================ 06 ORB */}
      <section className="sec dark" id="orb">
        <div className="wrap">
          <SectionHead
            kicker="06 — The agent"
            title="It offers. It never interrupts."
            note="Four states, one escalation ladder. The offer waits for a paragraph boundary and decays if you keep reading — PRD §6.5, made visible."
          />

          <div className="grid gap-4 md:grid-cols-4">
            {ORB_STATES.map((s) => (
              <div
                key={s.state}
                className="flex flex-col gap-4 p-5"
                style={{ border: "1px solid var(--hair-lt)", borderRadius: "var(--r)" }}
              >
                <div className="flex h-24 items-center justify-center">
                  {s.state === "speaking" ? (
                    <div className="scale-[0.72] origin-center">
                      <SpeakingPill
                        transcript="You read past the consolidation definition in under two seconds."
                        cites="c-14 · P 0.24"
                      />
                    </div>
                  ) : (
                    <AgentOrb state={s.state} size={44} onDark />
                  )}
                </div>
                <div>
                  <Cap style={{ color: "var(--bone)" }}>{s.label}</Cap>
                  <p
                    className="mt-2"
                    style={{ fontSize: "var(--t--1)", color: "var(--slate)", lineHeight: 1.5 }}
                  >
                    {s.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Cap style={{ color: "var(--slate)" }}>try it — tap to invite, swipe right to defer</Cap>
              <AgentOrb
                state={orbDemo}
                size={44}
                onDark
                onInvite={() => setOrbDemo("speaking")}
                onDefer={() => setOrbDemo("idle")}
              />
            </div>
            <div className="states" style={{ maxWidth: 460, flex: 1 }}>
              {ORB_STATES.map((s) => (
                <button
                  key={s.state}
                  type="button"
                  className={`st ${orbDemo === s.state ? "on" : ""}`}
                  onClick={() => setOrbDemo(s.state)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ 07 QUIZ */}
      <section className="sec" id="quiz" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="wrap">
          <SectionHead
            kicker="07 — The quiz"
            title="The number moves while it talks."
            note="The reader dims to 30%, the orb becomes a card, and the posterior counts to its new value with the contribution named. A state engine that talks."
          />

          <div
            className="relative overflow-hidden p-8"
            style={{ border: "1px solid var(--hair)", borderRadius: "var(--r)", background: "#F5F5F2" }}
          >
            <ReaderScrim active={dimmed}>
              <ReadingColumn>
                {PASSAGES.slice(0, 3).map((psg, i) => (
                  <Passage key={i} p={psg.p} confidence={psg.confidence ?? 1}>
                    {psg.text}
                  </Passage>
                ))}
              </ReadingColumn>
            </ReaderScrim>

            {dimmed && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <div className="pointer-events-auto w-full max-w-[30rem]">
                  <QuizOverlay
                    question="What makes a consolidated trace different from a labile one?"
                    chunkRef={`${target?.chunk_id ?? "c-14"} · lowest belief · targeted by vector search`}
                    p={shownP}
                    confidence={target?.confidence ?? 0.9}
                    delta={quizDelta?.d}
                    deltaLabel={quizDelta?.label}
                    listening={listening}
                    onMic={() => setListening((l) => !l)}
                    onDismiss={() => setDimmed(false)}
                    transcript={
                      quizDelta
                        ? "Graded 0.5 partial credit. 2.4s to first word, one hedge marker."
                        : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="pill cursor-pointer" onClick={() => setDimmed(true)}>
              <span className="bit" />
              Show overlay
            </button>
            <button
              type="button"
              className="pill cursor-pointer"
              onClick={() => answer(0.8, 0.45, "hedged")}
            >
              <span className="bit" />
              Answer, hedged
            </button>
            <button
              type="button"
              className="pill cursor-pointer"
              onClick={() => answer(0.95, 1, "fluent")}
            >
              <span className="bit" />
              Answer, fluent
            </button>
            <button
              type="button"
              className="pill cursor-pointer"
              onClick={() => answer(0.1, 1, "confident, wrong")}
            >
              <span className="bit" />
              Confident and wrong
            </button>
            <button type="button" className="pill cursor-pointer" onClick={resetQuiz}>
              Reset
            </button>
            {answerSource && <SourceTag source={answerSource} />}
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:items-end">
            <div className="flex items-end gap-10">
              <CountingP value={shownP} confidence={target?.confidence ?? 0.9} label="posterior" />
              <div className="flex flex-col gap-2">
                <DeltaChip delta={0.12} label="hedged" />
                <DeltaChip delta={0.31} label="fluent" />
                <DeltaChip delta={-0.09} label="confident, wrong" />
              </div>
            </div>
            <p className="norule" style={{ margin: 0 }}>
              A hesitant correct answer raises belief less than a fluent one, and a confident wrong
              answer lowers it — the label is the point. A number that moves without naming its
              evidence is just a number.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ 08 LIBRARY */}
      <section className="sec" id="library" style={{ borderTop: "1px solid var(--hair)" }}>
        <div className="wrap">
          <SectionHead
            kicker="08 — The library"
            title="One action. One profile."
            note="Paste a link or drop a PDF, and nothing competes with it. The profile card exists before the cold-start beat, so it is visibly not invented on the spot."
          />

          <div className="grid gap-6 md:grid-cols-[1.15fr_.85fr]">
            <div>
              <IngestCTA />
              <div className="mt-7">
                <div className="mb-2 flex items-center justify-between">
                  <Cap>previously read</Cap>
                  <SourceTag source={docsSource} />
                </div>
                {docs.map((d) => (
                  <DocumentRow
                    key={d.doc_id}
                    title={d.title}
                    meta={docMeta(d)}
                    p={d.retention}
                  />
                ))}
              </div>
            </div>

            <ProfileCard
              claim="You under-encode definitional passages after 20 minutes."
              p={0.42}
              stats={[
                { label: "Sessions", value: "7" },
                { label: "Chunks tracked", value: "142" },
                { label: "Weakest passage type", value: "definitional" },
                { label: "Retention half-life", value: "3.2 days" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ============================================================ FOOTER */}
      <footer
        className="relative overflow-hidden text-center"
        style={{
          background: "var(--void)",
          color: "var(--bone)",
          padding: "clamp(5rem,8vw,9rem) var(--pad)",
        }}
      >
        <div className="field-footer" />
        <div className="relative z-2">
          <div className="mx-auto mb-6 w-11">
            <Mark density="fused" size={44} goo={2.6} fill="var(--bone)" />
          </div>
          <p style={{ fontSize: "var(--t--1)", lineHeight: 1.7, letterSpacing: "-.01em" }}>
            Engram<sup style={{ fontSize: ".6em" }}>™</sup>
            <br />
            engram.dev
            <br />
            ©2026
          </p>
          <p
            className="mt-6"
            style={{
              fontSize: "var(--t--1)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
              lineHeight: 1.6,
            }}
          >
            Readers that keep
            <br />
            what they read.
          </p>
          <p className="mt-5" style={{ fontSize: "1rem" }}>
            ✳
          </p>
          <div className="mt-8 flex justify-center">
            <Wordmark fill="var(--bone)" size={22} />
          </div>
        </div>
      </footer>
    </>
  );
}
