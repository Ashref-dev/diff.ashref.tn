import { RowKind, type RowTable } from "./protocol";

/** Unchanged lines kept visible around every change. */
export const CONTEXT_LINES = 3;
/** Hiding fewer lines than this saves no space once the separator itself is drawn. */
const MIN_HIDDEN = 4;

export interface Gap {
  /** Stable across edits elsewhere: the old-side line index where the hidden run starts. */
  readonly key: number;
  readonly from: number;
  readonly to: number;
}

/** Visible list: entries >= 0 are row indexes, entries < 0 are `-(gapIndex + 1)`. */
export interface Layout {
  readonly items: Int32Array;
  readonly gaps: readonly Gap[];
}

export function collapse(table: RowTable, expanded: ReadonlySet<number>, full: boolean): Layout {
  const count = table.kinds.length;
  if (full) return { items: Int32Array.from({ length: count }, (_, i) => i), gaps: [] };

  const items: number[] = [];
  const gaps: Gap[] = [];
  let row = 0;
  while (row < count) {
    if (table.kinds[row] !== RowKind.Context) {
      items.push(row++);
      continue;
    }
    let end = row;
    while (end < count && table.kinds[end] === RowKind.Context) end++;
    const keepTop = row === 0 ? 0 : CONTEXT_LINES;
    const keepBottom = end === count ? 0 : CONTEXT_LINES;
    const from = row + keepTop;
    const to = end - keepBottom;
    const key = table.old[from] ?? from;
    if (to - from >= MIN_HIDDEN && !expanded.has(key)) {
      for (let i = row; i < from; i++) items.push(i);
      items.push(-(gaps.length + 1));
      gaps.push({ key, from, to });
      for (let i = to; i < end; i++) items.push(i);
    } else {
      for (let i = row; i < end; i++) items.push(i);
    }
    row = end;
  }
  return { items: Int32Array.from(items), gaps };
}
