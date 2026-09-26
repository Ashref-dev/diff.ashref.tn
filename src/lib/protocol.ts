// Messages shared by the main thread and diff.worker.ts.

export type Precision = "word" | "char";

export const CODE_LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "css",
  "html",
  "python",
  "go",
  "rust",
  "sql",
  "yaml",
  "markdown",
  "bash",
] as const;

export type CodeLang = (typeof CODE_LANGS)[number];
/** What the worker actually highlights with once "auto" is resolved. */
export type ResolvedLang = "plain" | CodeLang;
export type Lang = "auto" | ResolvedLang;

export interface CompareOptions {
  readonly precision: Precision;
  readonly ignoreWhitespace: boolean;
  readonly ignoreCase: boolean;
  readonly lang: Lang;
}

/** Row kinds stored in RowTable.kinds. `Modified` only occurs in split tables (a removed/added pair on one row). */
export const RowKind = { Context: 0, Removed: 1, Added: 2, Modified: 3 } as const;
export type RowKind = (typeof RowKind)[keyof typeof RowKind];

/** Column-oriented rows: `old[i]` / `new[i]` are 0-based line indexes, -1 when the side is empty. */
export interface RowTable {
  readonly kinds: Uint8Array;
  readonly old: Int32Array;
  readonly new: Int32Array;
}

/** Flat [start, end, start, end, …] ranges of intra-line changes, keyed by line index. */
export type MarkMap = Map<number, Uint32Array>;

export type DiffStatus = "empty" | "identical" | "changed";

export interface DiffResult {
  readonly status: DiffStatus;
  readonly split: RowTable;
  readonly unified: RowTable;
  readonly marks: { readonly old: MarkMap; readonly new: MarkMap };
  readonly stats: { readonly added: number; readonly removed: number };
  /** Widest line per side, in monospace columns (tabs count as 4). */
  readonly width: { readonly old: number; readonly new: number };
  readonly ms: number;
}

export interface DiffPayload extends DiffResult {
  readonly lang: ResolvedLang;
}

/**
 * Every line of one side, packed into two transferable arrays (no per-line objects to deserialize):
 * line i is data[offsets[i] .. offsets[i + 1]], a flat [length, paletteIndex, length, paletteIndex, …] run.
 */
export interface PackedTokens {
  readonly data: Uint32Array;
  readonly offsets: Uint32Array;
}

export interface SyntaxPayload {
  /** [lightColor, darkColor] pairs referenced by palette indexes. */
  readonly palette: readonly (readonly [string, string])[];
  /** null when that side was too large to highlight. */
  readonly old: PackedTokens | null;
  readonly new: PackedTokens | null;
}

export function lineTokens(packed: PackedTokens | null, line: number): Uint32Array | undefined {
  if (!packed || line + 1 >= packed.offsets.length) return undefined;
  return packed.data.subarray(packed.offsets[line], packed.offsets[line + 1]);
}

export type WorkerRequest =
  | { readonly type: "diff"; readonly id: number; readonly original: string; readonly modified: string; readonly options: CompareOptions }
  | { readonly type: "patch"; readonly id: number; readonly original: string; readonly modified: string };

export type WorkerResponse =
  | { readonly type: "diff"; readonly id: number; readonly payload: DiffPayload }
  | { readonly type: "syntax"; readonly id: number; readonly payload: SyntaxPayload }
  | { readonly type: "patch"; readonly id: number; readonly patch: string | null };
