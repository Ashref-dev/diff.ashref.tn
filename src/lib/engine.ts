import { diffArrays } from "diff";
import { inlineMarks } from "./inline";
import { toLines } from "./lines";
import { type CompareOptions, type DiffResult, type MarkMap, RowKind, type RowTable } from "./protocol";

/** Myers on very different huge inputs is quadratic; past this budget the changed middle becomes one replace block. */
const LINE_DIFF_TIMEOUT_MS = 1500;
/** Cap on intra-line diffs per comparison so pathological inputs stay bounded. */
const MAX_INLINE_PAIRS = 4000;
const TAB_WIDTH = 4;

type OpKind = "equal" | "removed" | "added";
interface Op {
  readonly kind: OpKind;
  readonly count: number;
}

class TableBuilder {
  private readonly kinds: number[] = [];
  private readonly old: number[] = [];
  private readonly new: number[] = [];

  push(kind: RowKind, oldIndex: number, newIndex: number): void {
    this.kinds.push(kind);
    this.old.push(oldIndex);
    this.new.push(newIndex);
  }

  build(): RowTable {
    return { kinds: Uint8Array.from(this.kinds), old: Int32Array.from(this.old), new: Int32Array.from(this.new) };
  }
}

function normalizer(options: CompareOptions): (line: string) => string {
  const { ignoreWhitespace, ignoreCase } = options;
  return (line) => {
    const spaced = ignoreWhitespace ? line.replace(/\s+/g, " ").trim() : line;
    return ignoreCase ? spaced.toLowerCase() : spaced;
  };
}

/** Maps every distinct (normalized) line to a small integer so the line diff compares numbers, not strings. */
function intern(a: readonly string[], b: readonly string[], key: (line: string) => string): readonly [Int32Array, Int32Array] {
  const ids = new Map<string, number>();
  const encode = (lines: readonly string[]): Int32Array => {
    const out = new Int32Array(lines.length);
    lines.forEach((line, i) => {
      const k = key(line);
      let id = ids.get(k);
      if (id === undefined) {
        id = ids.size;
        ids.set(k, id);
      }
      out[i] = id;
    });
    return out;
  };
  return [encode(a), encode(b)];
}

class OpList {
  readonly ops: Op[] = [];

  push(kind: OpKind, count: number): void {
    if (count <= 0) return;
    const last = this.ops[this.ops.length - 1];
    if (last?.kind === kind) this.ops[this.ops.length - 1] = { kind, count: last.count + count };
    else this.ops.push({ kind, count });
  }
}

function sharedPositions(seq: Int32Array, other: Int32Array): number[] {
  const present = new Set(other);
  const positions: number[] = [];
  seq.forEach((id, i) => {
    if (present.has(id)) positions.push(i);
  });
  return positions;
}

/**
 * Myers diff on the changed middle. Lines unique to one side cannot belong to any common subsequence,
 * so they are dropped before diffing (GNU diff's "discard" step): unrelated inputs cost O(n), not O(n²).
 */
function middleOps(a: Int32Array, b: Int32Array, out: OpList): void {
  const keepA = sharedPositions(a, b);
  const keepB = sharedPositions(b, a);
  const changes =
    keepA.length > 0 && keepB.length > 0
      ? diffArrays(
          keepA.map((i) => a[i] ?? -1),
          keepB.map((i) => b[i] ?? -1),
          { timeout: LINE_DIFF_TIMEOUT_MS },
        )
      : [];
  if (changes === undefined) {
    out.push("removed", a.length);
    out.push("added", b.length);
    return;
  }
  let ia = 0;
  let ib = 0;
  let ka = 0;
  let kb = 0;
  for (const change of changes) {
    if (change.added) {
      kb += change.count;
      continue;
    }
    if (change.removed) {
      ka += change.count;
      continue;
    }
    for (let n = 0; n < change.count; n++, ka++, kb++) {
      const matchA = keepA[ka] ?? a.length;
      const matchB = keepB[kb] ?? b.length;
      out.push("removed", matchA - ia);
      out.push("added", matchB - ib);
      out.push("equal", 1);
      ia = matchA + 1;
      ib = matchB + 1;
    }
  }
  out.push("removed", a.length - ia);
  out.push("added", b.length - ib);
}

function lineOps(a: Int32Array, b: Int32Array): readonly Op[] {
  const shortest = Math.min(a.length, b.length);
  let head = 0;
  while (head < shortest && a[head] === b[head]) head++;
  let endA = a.length;
  let endB = b.length;
  while (endA > head && endB > head && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out = new OpList();
  out.push("equal", head);
  middleOps(a.subarray(head, endA), b.subarray(head, endB), out);
  out.push("equal", a.length - endA);
  return out.ops;
}

function columns(lines: readonly string[]): number {
  let max = 0;
  for (const line of lines) {
    let width = line.length;
    for (let i = line.indexOf("\t"); i !== -1; i = line.indexOf("\t", i + 1)) width += TAB_WIDTH - 1;
    if (width > max) max = width;
  }
  return max;
}

export function computeDiff(original: string, modified: string, options: CompareOptions): DiffResult {
  const started = performance.now();
  const a = toLines(original);
  const b = toLines(modified);
  const [ka, kb] = intern(a, b, normalizer(options));

  const split = new TableBuilder();
  const unified = new TableBuilder();
  const marks: { old: MarkMap; new: MarkMap } = { old: new Map(), new: new Map() };
  let oi = 0;
  let ni = 0;
  let pendingRemoved = 0;
  let pendingAdded = 0;
  let added = 0;
  let removed = 0;
  let pairs = 0;

  const markPair = (o: number, n: number): void => {
    if (pairs >= MAX_INLINE_PAIRS) return;
    pairs++;
    const result = inlineMarks(a[o] ?? "", b[n] ?? "", options);
    if (result === null) return;
    if (result[0].length > 0) marks.old.set(o, result[0]);
    if (result[1].length > 0) marks.new.set(n, result[1]);
  };

  const flush = (): void => {
    const removedStart = oi - pendingRemoved;
    const addedStart = ni - pendingAdded;
    for (let i = 0; i < pendingRemoved; i++) unified.push(RowKind.Removed, removedStart + i, -1);
    for (let i = 0; i < pendingAdded; i++) unified.push(RowKind.Added, -1, addedStart + i);
    for (let i = 0; i < Math.max(pendingRemoved, pendingAdded); i++) {
      if (i < pendingRemoved && i < pendingAdded) {
        split.push(RowKind.Modified, removedStart + i, addedStart + i);
        markPair(removedStart + i, addedStart + i);
      } else if (i < pendingRemoved) {
        split.push(RowKind.Removed, removedStart + i, -1);
      } else {
        split.push(RowKind.Added, -1, addedStart + i);
      }
    }
    removed += pendingRemoved;
    added += pendingAdded;
    pendingRemoved = 0;
    pendingAdded = 0;
  };

  for (const op of lineOps(ka, kb)) {
    switch (op.kind) {
      case "equal":
        flush();
        for (let i = 0; i < op.count; i++, oi++, ni++) {
          split.push(RowKind.Context, oi, ni);
          unified.push(RowKind.Context, oi, ni);
        }
        break;
      case "removed":
        pendingRemoved += op.count;
        oi += op.count;
        break;
      case "added":
        pendingAdded += op.count;
        ni += op.count;
        break;
    }
  }
  flush();

  const status = a.length === 0 && b.length === 0 ? "empty" : added === 0 && removed === 0 ? "identical" : "changed";
  return {
    status,
    split: split.build(),
    unified: unified.build(),
    marks,
    stats: { added, removed },
    width: { old: columns(a), new: columns(b) },
    ms: performance.now() - started,
  };
}
