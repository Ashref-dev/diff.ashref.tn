import { diffChars, diffWordsWithSpace } from "diff";
import type { CompareOptions } from "./protocol";

/** Lines longer than this are only tinted, never diffed character by character. */
const MAX_LINE = 2000;
/** Upper bound on edit distance per line pair; beyond it the pair is treated as a full rewrite. */
const MAX_EDIT = 300;
/** Below this share of shared text, word highlights are noise: the whole-line tint says it better. */
const MIN_SIMILARITY = 0.15;
const WHITESPACE = /^\s*$/;

export type InlineMarks = readonly [Uint32Array, Uint32Array];

function push(ranges: number[], start: number, end: number): void {
  const last = ranges.length - 1;
  if (last > 0 && ranges[last] === start) ranges[last] = end;
  else ranges.push(start, end);
}

/** Intra-line change ranges for a removed/added line pair, or null when highlighting would not help. */
export function inlineMarks(a: string, b: string, options: CompareOptions): InlineMarks | null {
  if (a.length > MAX_LINE || b.length > MAX_LINE || a.length === 0 || b.length === 0) return null;
  const settings = { ignoreCase: options.ignoreCase, maxEditLength: MAX_EDIT };
  const parts = options.precision === "char" ? diffChars(a, b, settings) : diffWordsWithSpace(a, b, settings);
  if (parts === undefined) return null;

  const oldRanges: number[] = [];
  const newRanges: number[] = [];
  let ai = 0;
  let bi = 0;
  let common = 0;
  for (const part of parts) {
    const len = part.value.length;
    const visible = !(options.ignoreWhitespace && WHITESPACE.test(part.value));
    if (part.added) {
      if (visible) push(newRanges, bi, bi + len);
      bi += len;
    } else if (part.removed) {
      if (visible) push(oldRanges, ai, ai + len);
      ai += len;
    } else {
      ai += len;
      bi += len;
      common += len;
    }
  }
  // Case folding can change string length for a few code points; offsets would drift, so bail out.
  if (ai !== a.length || bi !== b.length) return null;
  if (common * 2 < (a.length + b.length) * MIN_SIMILARITY) return null;
  if (oldRanges.length === 0 && newRanges.length === 0) return null;
  return [Uint32Array.from(oldRanges), Uint32Array.from(newRanges)];
}
