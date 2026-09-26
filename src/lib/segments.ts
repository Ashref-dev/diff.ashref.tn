export interface Segment {
  readonly text: string;
  /** Syntax palette index, -1 for default ink. */
  readonly color: number;
  readonly marked: boolean;
}

/**
 * Splits a line at every syntax-token and intra-line-change boundary so each segment has one color
 * and one highlight state. `syntax` is [length, color, …]; `marks` is sorted [start, end, …].
 */
export function segmentize(line: string, syntax: ArrayLike<number> | undefined, marks: ArrayLike<number> | undefined): Segment[] {
  if (!syntax && !marks) return [{ text: line, color: -1, marked: false }];
  const tokens = syntax ?? [];
  const ranges = marks ?? [];
  const out: Segment[] = [];
  let pos = 0;
  let token = 0;
  let tokenEnd = tokens[0] ?? Infinity;
  let mark = 0;
  while (pos < line.length) {
    while (tokenEnd <= pos) {
      token++;
      tokenEnd = token * 2 < tokens.length ? tokenEnd + (tokens[token * 2] ?? 0) : Infinity;
    }
    while (mark * 2 < ranges.length && (ranges[mark * 2 + 1] ?? 0) <= pos) mark++;
    const markStart = ranges[mark * 2] ?? Infinity;
    const markEnd = ranges[mark * 2 + 1] ?? Infinity;
    const marked = pos >= markStart;
    const end = Math.min(tokenEnd, marked ? markEnd : markStart, line.length);
    const color = token * 2 < tokens.length ? (tokens[token * 2 + 1] ?? -1) : -1;
    out.push({ text: line.slice(pos, end), color, marked });
    pos = end;
  }
  return out;
}
