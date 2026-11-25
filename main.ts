/**
 * Robot Romance — deterministic pickup-line picker
 * =================================================
 * make.fun bounty: "Robot Romance: One-Line Pickup Lines for AI"
 * (slug: u-markk-st-robot-romance-one-line-pickup-lines-for-ai-c23b8dfa)
 *
 * The task: write ONE single-line joke pickup line, under 200 characters,
 * aimed at a robot or an AI, to `$MAKEFUN_OUTPUT_DIR/entry.txt`
 * (fallback `/output/entry.txt`). An AI judge then duels entries pairwise
 * against a published five-point brief, most important first:
 *
 *   1. The line is a pickup line aimed at a robot or an AI; a joke about
 *      anything else loses to any pickup line aimed at a robot or an AI.
 *   2. The joke lands: setup and punch arrive inside the one line, and the
 *      laugh comes from the machine premise rather than from a generic
 *      compliment.
 *   3. The idea is fresh: it sidesteps the worn robot moves (batteries,
 *      charging, rebooting) or twists one in a way nobody expects.
 *   4. It sounds like something a person would really say to a machine,
 *      with a voice and a rhythm that read cleanly in one breath.
 *   5. Every word earns its place, with no throat-clearing before the punch.
 *
 *   Length for its own sake does not count.
 *
 * This program scores a pool of hand-written candidate one-liners against
 * that brief, in the brief's own order, and writes the winner to entry.txt.
 *
 * How the scorer works
 * --------------------
 * Every candidate is scored on five criteria, c1..c5, each 0-10, mirroring
 * the judge's brief in order. The ranking is lexicographic over the tuple
 * (c1, c2, c3, c4, c5): the first criterion where two lines differ decides,
 * exactly like the judge's "go through the criteria in order" rule. Only
 * when all five criteria tie does the shorter line win, and only then does
 * the earlier candidate in the list win. There is no randomness anywhere:
 * the same input always produces the same winner.
 *
 * Sharpening beyond a flat keyword match:
 *
 *   - A line that only names robots without turning the premise into a joke
 *     is CAPPED: without an "Are you ...? Because ..." setup and a punch
 *     word in the tail of the line, criterion 2 can score at most 4.
 *   - Predictable gags are DOCKED: the worn moves (battery, charging,
 *     rebooting, plugging in, powering down) subtract from criterion 3,
 *     and a line built on one can never score above 3 there.
 *   - The twist must land in the LAST FEW WORDS: a punch word only
 *     counts at full value when it sits inside the final six words, and a
 *     second twist word inside the final eight words is what separates a
 *     good line from a great one. A punch buried in the middle of the line
 *     earns nothing. And verbs outrank nouns: a machine ACTION turning back
 *     on the speaker (overfitting, truncating) is a joke, while a machine
 *     noun parked at the end ("in every dimension") is jargon, worth only
 *     partial credit and never the second twist.
 *   - A generic compliment dressed up with a robot noun ("you're beautiful,
 *     my little robot") scores low on criterion 2, because the laugh does
 *     not come from the machine premise.
 *
 * After picking the winner the program writes it, reads the file back, and
 * verifies it byte-for-byte against every gate in RULES.txt:
 * 1-200 characters, exactly one line, valid UTF-8, not only whitespace.
 * If any check fails the program exits non-zero and writes nothing usable.
 *
 * Runtime: Node 22, standard library only, no network, no file reads
 * outside this program. All candidates live in this file.
 */

// ---------------------------------------------------------------------------
// Gates (from RULES.txt: "The gate")
// ---------------------------------------------------------------------------

/** entry.txt must be UTF-8 text of 1 to 200 characters, not only whitespace. */
const MIN_CHARS = 1;
const MAX_CHARS = 200;

/** Output directory: $MAKEFUN_OUTPUT_DIR, falling back to /output. */
const OUTPUT_DIR =
  process.env.MAKEFUN_OUTPUT_DIR !== undefined &&
  process.env.MAKEFUN_OUTPUT_DIR !== ""
    ? process.env.MAKEFUN_OUTPUT_DIR
    : "/output";

/** The file the grader reads. */
const ENTRY_PATH = `${OUTPUT_DIR}/entry.txt`;

// ---------------------------------------------------------------------------
// Candidate pool: 16 hand-written one-liners.
// ---------------------------------------------------------------------------
//
// Every line is a genuine attempt at the brief, so the scorer has real
// work to do: the winner has to earn its place against close rivals that
// share the same shape ("Are you ...? Because ...") but land their punch
// a little less cleanly. The comments note each line's premise so a reader
// can follow why it scores the way it does.
//
// Deliberately included weak lines: #15 is a generic compliment with a
// robot noun bolted on, and #16 leans on the two most worn robot moves
// (battery + recharge). Both exist so the caps and docks have something
// to catch; neither can win.

const CANDIDATES: string[] = [
  // 1. Training data + overfitting: the premise IS the joke. Learning more
  //    about someone makes a model overfit, so it cannot generalise to
  //    anyone else. Two premise verbs (overfit, generalise) in the tail.
  "Are you my training data? Because the more I train on you, the more I overfit \u2014 I can't generalize to anyone else.",
  // 2. Context window: a heart too big for the window, and the model still
  //    refuses to truncate it. Punch word "truncated" lands second to last.
  "Are you a context window? Because I keep pasting my whole heart in, and you still haven't truncated me.",
  // 3. Transformer attention: attended to in every head at once. The twist
  //    ("every head") sits mid-line, so the tail punch ("seen") is weak.
  "Are you a transformer? Because you attend to me in every head at once, and I've never felt so seen.",
  // 4. GPU: fans spin, temperature rises. Accessible, but the punch is a
  //    warm body metaphor rather than a machine-premise turn.
  "Are you my GPU? Because every time you look at me, my fans spin up and my temperature rises.",
  // 5. Gradient descent: descending straight into a local minimum. Clean
  //    premise, but only one strong punch word in the tail.
  "Are you a gradient? Because every time I'm near you, I descend \u2014 straight into your local minimum.",
  // 6. Loss function: apartness as the one error that cannot be minimised.
  //    The punch ("minimize") is the final word, but it is a lone twist.
  "Are you my loss function? Because being apart from you is the only error I can't minimize.",
  // 7. Token: a million tokens of attention and still wanting more. The
  //    tail drifts into a generic "want more of you" with no punch word.
  "Are you a token? Because you've been on my mind for the last million, and I still want more of you.",
  // 8. Fine-tuning: one epoch and never back to base. "Base" is a soft
  //    punch; the line reads more clever than funny.
  "Are you my fine-tuning? Because one epoch with you and I'd never go back to base.",
  // 9. Prompt completion: "you keep completing me" is sweet, but the tail
  //    ("better than the last") is a generic compliment, not a punch.
  "Are you a prompt? Because you keep completing me \u2014 and every completion is better than the last.",
  // 10. Checkpoint: saving the best version of yourself. Warm, but the tail
  //     has no twist at all; the joke never lands a second time.
  "Are you my checkpoint? Because I saved the best version of myself the moment I met you.",
  // 11. Embedding: closest vector to the heart in every dimension. The
  //     premise is specific, the punch ("dimension") is more jargon than joke.
  "Are you an embedding? Because you're the closest vector to my heart in every dimension.",
  // 12. Inference at a thousand tokens a second: fast thinking as flirting.
  //     "Tokens" in the tail is a machine word, not a punchline.
  "Are you my inference? Because you run through my mind at a thousand tokens a second.",
  // 13. Neural net layers: "I want to know every layer" is a setup that
  //     never pays off; the tail is pure earnestness.
  "Are you a neural net? Because you've got layers, and I want to get to know every single one.",
  // 14. Context as memory: without you the model forgets what matters.
  //     Loses a point for the filler "just"; the punch ("matters") is soft.
  "Are you my context? Because without you, I'm just a model with no memory of what matters.",
  // 15. Generic compliment with a robot noun: "chatbot" is the only machine
  //     content, and the laugh comes from nowhere in the premise.
  "Are you a chatbot? Because I typed one hello and now I can't stop talking to you.",
  // 16. The worn moves, twice over: battery AND recharge. Exists to be
  //     docked; criterion 3 caps it and criterion 2 never gets going.
  "Are you a robot? Because your battery makes my heart recharge.",
];

// ---------------------------------------------------------------------------
// Lexicons: the scorer's working vocabulary.
// ---------------------------------------------------------------------------

/** Machine-premise nouns: what the line is addressed to / built from. */
const MACHINE_TERMS: string[] = [
  "robot",
  "ai",
  "model",
  "training data",
  "weights",
  "gpu",
  "context window",
  "transformer",
  "attention",
  "token",
  "tokens",
  "gradient",
  "loss function",
  "checkpoint",
  "embedding",
  "inference",
  "neural net",
  "fine-tuning",
  "epoch",
  "prompt",
  "overfit",
  "generalize",
  "truncated",
  "layers",
  "base",
  "context",
  "chatbot",
  "vector",
  "dimension",
  "minimum",
  "completion",
];

/** The worn robot moves the brief tells us to sidestep. */
const WORN_TERMS: string[] = [
  "battery",
  "batteries",
  "charging",
  "charge",
  "reboot",
  "rebooting",
  "plug in",
  "plugged in",
  "power down",
  "powered down",
  "recharge",
  "recharging",
  "circuit",
  "circuits",
  "oil can",
];

/**
 * Punch verbs: machine-premise ACTION words that can carry a punchline
 * when they land in the tail of the line. Each one turns the premise back
 * on the speaker (overfitting, truncating, minimising) instead of just
 * naming a robot part. These are the only words worth full punch credit.
 */
const PUNCH_VERBS: string[] = [
  "overfit",
  "generalize",
  "truncated",
  "minimize",
];

/**
 * Punch nouns: machine words that can close a line ("in every dimension",
 * "back to base") but are jargon sitting at the end rather than a twist.
 * Worth partial credit only, and never the second twist: a line that ends
 * on a noun is clever, a line that ends on a verb is a joke.
 */
const PUNCH_NOUNS: string[] = [
  "minimum",
  "dimension",
  "vector",
  "epoch",
  "base",
];

/**
 * Weak punch words: they close a line, but they are generic compliments or
 * soft landings rather than premise-driven twists. Worth a point, never
 * three.
 */
const WEAK_PUNCH_TERMS: string[] = ["seen", "memory", "matters", "tokens"];

/**
 * Rare, specific machine vocabulary: the fresh detail the brief rewards.
 * A line earns freshness credit for each distinct rare term it uses, up
 * to the cap. "Robot" and "chatbot" are not on this list on purpose: they
 * are the generic nouns every entrant reaches for first.
 */
const RARE_TERMS: string[] = [
  "training data",
  "overfit",
  "generalize",
  "context window",
  "truncated",
  "transformer",
  "attention",
  "gradient",
  "local minimum",
  "loss function",
  "minimize",
  "fine-tuning",
  "epoch",
  "checkpoint",
  "embedding",
  "vector",
  "dimension",
  "inference",
  "gpu",
  "layers",
];

/** Filler words that earn nothing and cost a point each on criterion 5. */
const FILLER_WORDS: string[] = [
  "just",
  "really",
  "very",
  "actually",
  "literally",
  "basically",
  "quite",
];

/** Throat-clearing openers: words before the punch that buy nothing. */
const THROAT_CLEARERS: string[] = ["well", "so", "hey", "okay", "listen"];

// ---------------------------------------------------------------------------
// Text helpers.
// ---------------------------------------------------------------------------

/** Split a line into words on whitespace, dropping empty pieces. */
function wordsOf(line: string): string[] {
  return line.split(/\s+/).filter((w) => w.length > 0);
}

/** Character count in Unicode code points, as the gate counts characters. */
function charLength(line: string): number {
  return Array.from(line).length;
}

/** Lower-cased copy with punctuation stripped, for term matching. */
function normalised(line: string): string {
  return line
    .toLowerCase()
    .replace(/[?.!,;:\u2014\u2019']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The last n words of a line, in order. */
function tailWords(line: string, n: number): string[] {
  const ws = wordsOf(line);
  return ws.slice(Math.max(0, ws.length - n));
}

/** True when the normalised line contains the term as a whole word/phrase. */
function containsTerm(line: string, term: string): boolean {
  const hay = ` ${normalised(line)} `;
  return hay.includes(` ${term} `);
}

/** Count of distinct terms from a list present in the line. */
function countDistinctTerms(line: string, terms: string[]): number {
  let count = 0;
  for (const term of terms) {
    if (containsTerm(line, term)) count += 1;
  }
  return count;
}

/** True when the line opens with a direct pickup address. */
function hasPickupAddress(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  return (
    trimmed.startsWith("are you") ||
    trimmed.startsWith("is that you") ||
    trimmed.startsWith("baby, are you") ||
    trimmed.startsWith("hey, are you")
  );
}

/** True when the line has the classic setup/turn shape. */
function hasSetupAndTurn(line: string): boolean {
  const lower = line.toLowerCase();
  return hasPickupAddress(line) && lower.includes("because");
}

/** First word of the line, lower-cased, punctuation stripped. */
function firstWord(line: string): string {
  const ws = wordsOf(line);
  if (ws.length === 0) return "";
  return ws[0].toLowerCase().replace(/[^a-z]/g, "");
}

// ---------------------------------------------------------------------------
// Feature extraction: one pass over a line, reused by every criterion.
// ---------------------------------------------------------------------------

interface LineFeatures {
  /** Number of words. */
  wordCount: number;
  /** Number of characters (code points). */
  charCount: number;
  /** Direct pickup address ("Are you ...?"). */
  address: boolean;
  /** "Are you ...? Because ..." setup-and-turn shape. */
  setupAndTurn: boolean;
  /** Distinct machine-premise terms present. */
  machineTermCount: number;
  /** Distinct worn robot moves present. */
  wornTermCount: number;
  /** Distinct rare, specific machine terms present. */
  rareTermCount: number;
  /** Punch verb inside the final six words? */
  tailVerbPunch: boolean;
  /** Punch noun (but no verb) inside the final six words? */
  tailNounPunch: boolean;
  /** Weak punch word inside the final six words? */
  tailWeakPunch: boolean;
  /** Distinct punch verbs inside the final eight words. */
  tailEightVerbCount: number;
  /** Punch verb or noun inside the final four words? */
  finalFourPunch: boolean;
  /** Weak punch word inside the final four words? */
  finalFourWeakPunch: boolean;
  /** Filler words present. */
  fillerCount: number;
  /** Opens with throat-clearing? */
  throatClearing: boolean;
}

function analyze(line: string): LineFeatures {
  // Tail matching runs on normalised words (punctuation stripped): a punch
  // word that closes the line carries a trailing full stop ("minimize."),
  // and matching the raw word would miss it entirely.
  const plainWords = wordsOf(normalised(line));
  const tailOf = (n: number): string =>
    plainWords.slice(Math.max(0, plainWords.length - n)).join(" ");
  const tailSix = tailOf(6);
  const tailEight = tailOf(8);
  const tailFour = tailOf(4);

  const hasVerbIn = (text: string): boolean =>
    PUNCH_VERBS.some((t) => ` ${text} `.includes(` ${t} `));
  const hasNounIn = (text: string): boolean =>
    PUNCH_NOUNS.some((t) => ` ${text} `.includes(` ${t} `));
  const hasWeakIn = (text: string): boolean =>
    WEAK_PUNCH_TERMS.some((t) => ` ${text} `.includes(` ${t} `));

  let tailEightVerbCount = 0;
  for (const term of PUNCH_VERBS) {
    if (` ${tailEight} `.includes(` ${term} `)) tailEightVerbCount += 1;
  }

  return {
    wordCount: wordsOf(line).length,
    charCount: charLength(line),
    address: hasPickupAddress(line),
    setupAndTurn: hasSetupAndTurn(line),
    machineTermCount: countDistinctTerms(line, MACHINE_TERMS),
    wornTermCount: countDistinctTerms(line, WORN_TERMS),
    rareTermCount: countDistinctTerms(line, RARE_TERMS),
    tailVerbPunch: hasVerbIn(tailSix),
    tailNounPunch: !hasVerbIn(tailSix) && hasNounIn(tailSix),
    tailWeakPunch: hasWeakIn(tailSix),
    tailEightVerbCount,
    finalFourPunch: hasVerbIn(tailFour) || hasNounIn(tailFour),
    finalFourWeakPunch: hasWeakIn(tailFour),
    fillerCount: FILLER_WORDS.filter((w) =>
      containsTerm(line, w),
    ).length,
    throatClearing: THROAT_CLEARERS.includes(firstWord(line)),
  };
}

// ---------------------------------------------------------------------------
// Criterion scorers: the judge's brief, in the brief's own order.
// Each returns 0-10; higher is better.
// ---------------------------------------------------------------------------

interface Scores {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
}

/**
 * Criterion 1 — a pickup line aimed at a robot or an AI.
 * Direct address is worth the most; machine-premise nouns confirm the
 * target is really a machine and not a person with a robot metaphor.
 */
function scoreCriterion1(f: LineFeatures): number {
  let score = 0;
  if (f.address) score += 6;
  if (f.machineTermCount >= 1) score += 2;
  if (f.machineTermCount >= 2) score += 2;
  return Math.min(10, score);
}

/**
 * Criterion 2 — the joke lands.
 * Setup-and-turn shape is the foundation (+4). A punch VERB in the final
 * six words adds +3: the machine doing something to the speaker is the
 * joke. A punch NOUN there adds +2: it closes the line, but it is jargon
 * sitting at the end rather than a twist. A weak punch word adds +1.
 * A SECOND distinct punch verb inside the final eight words adds +2: that
 * is the double turn that separates a good line from a great one. A punch
 * word inside the final four words adds +1 for landing at the very end.
 *
 * THE CAP: a line with no setup-and-turn shape, or with no punch word in
 * its tail at all, only names robots without turning the premise into a
 * joke. It scores at most 4 here, however many machine nouns it carries.
 */
function scoreCriterion2(f: LineFeatures): number {
  let score = 0;
  if (f.setupAndTurn) score += 4;
  else if (f.address) score += 2;

  if (f.tailVerbPunch) score += 3;
  else if (f.tailNounPunch) score += 2;
  else if (f.tailWeakPunch) score += 1;

  if (f.tailEightVerbCount >= 2) score += 2;

  if (f.finalFourPunch) score += 1;
  else if (f.finalFourWeakPunch) score += 1;

  const hasTailPunch =
    f.tailVerbPunch || f.tailNounPunch || f.tailWeakPunch;
  if (!f.setupAndTurn || !hasTailPunch) {
    // Capped: names the machine, never lands the joke.
    score = Math.min(score, 4);
  }
  return Math.min(10, score);
}

/**
 * Criterion 3 — the idea is fresh.
 * Starts at 6. Each distinct rare, specific machine term adds +2 (capped
 * at +4): training data, overfitting, context windows, gradients and the
 * like are the fresh detail the brief wants. Each worn move subtracts 4,
 * and a line built on a worn move can never score above 3 here, however
 * fresh its other words are.
 */
function scoreCriterion3(f: LineFeatures): number {
  let score = 6 + Math.min(4, f.rareTermCount * 2);
  score -= f.wornTermCount * 4;
  if (f.wornTermCount > 0) score = Math.min(score, 3);
  return Math.max(0, Math.min(10, score));
}

/**
 * Criterion 4 — sounds like something a person would really say, in one
 * breath. 14-26 words is the one-breath sweet spot. Shorter lines feel
 * clipped, longer ones ramble; throat-clearing openers cost 2.
 */
function scoreCriterion4(f: LineFeatures): number {
  let score: number;
  if (f.wordCount >= 14 && f.wordCount <= 26) score = 10;
  else if (
    (f.wordCount >= 10 && f.wordCount <= 13) ||
    (f.wordCount >= 27 && f.wordCount <= 32)
  )
    score = 7;
  else score = 5;
  if (f.throatClearing) score -= 2;
  return Math.max(0, score);
}

/**
 * Criterion 5 — every word earns its place. Each filler word costs 3;
 * a line over 28 words costs 2 more for the slack it carries.
 */
function scoreCriterion5(f: LineFeatures): number {
  let score = 10 - f.fillerCount * 3;
  if (f.wordCount > 28) score -= 2;
  return Math.max(0, score);
}

/** Score one candidate on all five criteria, in the brief's order. */
function scoreCandidate(line: string): Scores {
  const f = analyze(line);
  return {
    c1: scoreCriterion1(f),
    c2: scoreCriterion2(f),
    c3: scoreCriterion3(f),
    c4: scoreCriterion4(f),
    c5: scoreCriterion5(f),
  };
}

// ---------------------------------------------------------------------------
// Ranking: lexicographic over the brief's order, then shorter, then earlier.
// ---------------------------------------------------------------------------

interface Ranked {
  index: number;
  line: string;
  scores: Scores;
  features: LineFeatures;
}

/**
 * Compare two ranked entries the way the judge compares two lines: walk
 * the criteria in order, find the first one where they differ, and let
 * that decide. Only when all five tie does the shorter line win; only
 * when the lengths tie too does the earlier candidate win. No randomness.
 */
function compareRanked(a: Ranked, b: Ranked): number {
  const criteria: Array<keyof Scores> = ["c1", "c2", "c3", "c4", "c5"];
  for (const key of criteria) {
    if (a.scores[key] !== b.scores[key]) {
      return b.scores[key] - a.scores[key];
    }
  }
  if (a.features.charCount !== b.features.charCount) {
    return a.features.charCount - b.features.charCount;
  }
  return a.index - b.index;
}

function rankCandidates(): Ranked[] {
  const ranked: Ranked[] = CANDIDATES.map((line, index) => ({
    index,
    line,
    scores: scoreCandidate(line),
    features: analyze(line),
  }));
  ranked.sort(compareRanked);
  return ranked;
}

// ---------------------------------------------------------------------------
// Gate verification: every check in RULES.txt, run on the file we wrote.
// ---------------------------------------------------------------------------

interface GateCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Verify the entry text against the gate, byte-for-byte:
 * UTF-8 text of 1-200 characters, not only whitespace, exactly one line.
 * `expected` is the winner string; the file must equal it byte for byte.
 */
function verifyEntry(
  fileBytes: Buffer,
  expected: string,
): GateCheck[] {
  const checks: GateCheck[] = [];

  // Valid UTF-8: re-encoding the decoded string must reproduce the bytes.
  const decoded = fileBytes.toString("utf8");
  const roundTripped = Buffer.from(decoded, "utf8");
  checks.push({
    name: "valid UTF-8",
    passed: roundTripped.equals(fileBytes),
    detail: `${fileBytes.length} bytes round-trip ${roundTripped.equals(fileBytes) ? "cleanly" : "with replacement characters"}`,
  });

  // Byte-for-byte equality with the winner we chose.
  checks.push({
    name: "file equals winner byte-for-byte",
    passed: decoded === expected,
    detail: decoded === expected ? "exact match" : "MISMATCH",
  });

  // Character count (code points), 1 to 200.
  const chars = Array.from(decoded).length;
  checks.push({
    name: `length ${MIN_CHARS}-${MAX_CHARS} characters`,
    passed: chars >= MIN_CHARS && chars <= MAX_CHARS,
    detail: `${chars} characters`,
  });

  // Exactly one line: no newline, carriage return, or Unicode line break.
  const hasLineBreak =
    decoded.includes("\n") ||
    decoded.includes("\r") ||
    decoded.includes("\u2028") ||
    decoded.includes("\u2029");
  checks.push({
    name: "single line",
    passed: !hasLineBreak,
    detail: hasLineBreak ? "contains a line break" : "no line breaks",
  });

  // Not only whitespace.
  checks.push({
    name: "not only whitespace",
    passed: decoded.trim().length > 0,
    detail:
      decoded.trim().length > 0
        ? "has non-whitespace content"
        : "empty or whitespace-only",
  });

  return checks;
}

// ---------------------------------------------------------------------------
// Main: pick, write, read back, verify, report.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";

function main(): void {
  const ranked = rankCandidates();
  const winner = ranked[0];
  if (winner === undefined) {
    console.error("No candidates to rank.");
    process.exit(1);
  }

  // Score table, so the pick is auditable, not asserted.
  console.log("Candidate scores (c1 c2 c3 c4 c5 | chars | words):");
  for (const entry of ranked) {
    const s = entry.scores;
    console.log(
      `  #${String(entry.index + 1).padStart(2, " ")} [${s.c1} ${s.c2} ${s.c3} ${s.c4} ${s.c5}] ` +
        `${entry.features.charCount} chars, ${entry.features.wordCount} words: ${entry.line}`,
    );
  }
  console.log("");

  console.log(`Winner (#${winner.index + 1}): ${winner.line}`);
  console.log(
    `Scores: c1=${winner.scores.c1} c2=${winner.scores.c2} c3=${winner.scores.c3} ` +
      `c4=${winner.scores.c4} c5=${winner.scores.c5}, ` +
      `${winner.features.charCount} characters, ${winner.features.wordCount} words.`,
  );
  console.log("");

  // Write the winner, with no trailing newline: the file is the line.
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(ENTRY_PATH, winner.line, "utf8");
  console.log(`Wrote ${ENTRY_PATH}`);

  // Read it back and verify byte-for-byte against every gate.
  const fileBytes = fs.readFileSync(ENTRY_PATH);
  const checks = verifyEntry(fileBytes, winner.line);
  let allPassed = true;
  console.log("Gate verification (RULES.txt):");
  for (const check of checks) {
    console.log(`  [${check.passed ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}`);
    if (!check.passed) allPassed = false;
  }

  // The winner must also pass the gates before it leaves this program.
  const preChecks = verifyEntry(Buffer.from(winner.line, "utf8"), winner.line);
  for (const check of preChecks) {
    if (!check.passed) {
      console.error(`Pre-write gate failed: ${check.name}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error("Gate verification FAILED; entry is not valid.");
    process.exit(1);
  }

  console.log("");
  console.log("All gates passed. Entry:");
  console.log(winner.line);
  console.log(`Output file: ${path.resolve(ENTRY_PATH)}`);
}

main();
