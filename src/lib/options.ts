import { useSyncExternalStore } from "react";
import { CODE_LANGS, type Lang, type Precision } from "./protocol";

export type ViewMode = "split" | "unified";

export interface Options {
  readonly view: ViewMode;
  readonly precision: Precision;
  readonly ignoreWhitespace: boolean;
  readonly ignoreCase: boolean;
  readonly wrap: boolean;
  readonly fullFile: boolean;
  readonly lang: Lang;
}

/** GitHub's diff defaults: unified, word highlights, no wrapping, 3 lines of collapsed context. */
export const DEFAULT_OPTIONS: Options = {
  view: "unified",
  precision: "word",
  ignoreWhitespace: false,
  ignoreCase: false,
  wrap: false,
  fullFile: false,
  lang: "auto",
};

// v3 moved to GitHub-like defaults; bumping the key gives returning visitors those defaults once.
const KEY = "diff:options:v3";
const LANG_SET: ReadonlySet<string> = new Set<string>(["auto", "plain", ...CODE_LANGS]);

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && LANG_SET.has(value);
}

function pick<T>(value: unknown, fallback: T, accept: (v: unknown) => v is T): T {
  return accept(value) ? value : fallback;
}

const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isView = (v: unknown): v is ViewMode => v === "split" || v === "unified";
const isPrecision = (v: unknown): v is Precision => v === "word" || v === "char";

function parse(raw: string | null): Options {
  if (!raw) return DEFAULT_OPTIONS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_OPTIONS;
    const d: Record<string, unknown> = { ...data };
    const o = DEFAULT_OPTIONS;
    return {
      view: pick(d.view, o.view, isView),
      precision: pick(d.precision, o.precision, isPrecision),
      ignoreWhitespace: pick(d.ignoreWhitespace, o.ignoreWhitespace, isBool),
      ignoreCase: pick(d.ignoreCase, o.ignoreCase, isBool),
      wrap: pick(d.wrap, o.wrap, isBool),
      fullFile: pick(d.fullFile, o.fullFile, isBool),
      lang: pick(d.lang, o.lang, isLang),
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function read(): Options {
  try {
    localStorage.removeItem("diff:options:v2");
    return parse(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_OPTIONS;
  }
}

let current = read();
const listeners = new Set<() => void>();

export function setOptions(patch: Partial<Options>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private mode or full storage: options still apply for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOptions(): Options {
  return useSyncExternalStore(subscribe, () => current);
}
