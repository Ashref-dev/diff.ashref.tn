// Worker-only: lazily loaded the first time a code language is picked. Never part of the main bundle.
import { createHighlighterCore, type GrammarState, type HighlighterCore, type LanguageInput, type ThemedToken } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { toLines } from "./lines";
import type { CodeLang, PackedTokens, SyntaxPayload } from "./protocol";
import { paperDark, paperLight } from "./syntax-themes";

const LANGS: Record<CodeLang, LanguageInput> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
};

/** Tokenizing is ~100x the cost of diffing; above these sizes the side stays plain. */
const MAX_CHARS = 600_000;
/** Lines per tokenize call; the worker yields between chunks so newer diffs are never stuck behind highlighting. */
const CHUNK_LINES = 300;
const THEMES = { light: paperLight.name ?? "paper-light", dark: paperDark.name ?? "paper-dark" };

const ABORTED = Symbol("aborted");
type Tokenized = PackedTokens | null | typeof ABORTED;

let highlighter: Promise<HighlighterCore> | null = null;
const loaded = new Set<CodeLang>();
const palette: [string, string][] = [];
const paletteIndex = new Map<string, number>();
const cache: Record<"old" | "new", { lang: CodeLang; text: string; lines: PackedTokens | null } | null> = { old: null, new: null };

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [paperLight, paperDark],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
}

function colorIndex(token: ThemedToken): number {
  const light = token.htmlStyle?.["--shiki-light"] ?? token.color ?? "";
  const dark = token.htmlStyle?.["--shiki-dark"] ?? light;
  const key = `${light}|${dark}`;
  let index = paletteIndex.get(key);
  if (index === undefined) {
    index = palette.length;
    palette.push([light, dark]);
    paletteIndex.set(key, index);
  }
  return index;
}

class Packer {
  private readonly data: number[] = [];
  private readonly offsets: number[] = [0];

  /** Appends one line as [length, color, …], merging neighbours that share a color. */
  line(tokens: readonly ThemedToken[]): void {
    const start = this.data.length;
    for (const token of tokens) {
      const color = colorIndex(token);
      const last = this.data.length - 1;
      if (last > start && this.data[last] === color) this.data[last - 1] = (this.data[last - 1] ?? 0) + token.content.length;
      else this.data.push(token.content.length, color);
    }
    this.offsets.push(this.data.length);
  }

  build(): PackedTokens {
    return { data: Uint32Array.from(this.data), offsets: Uint32Array.from(this.offsets) };
  }
}

/** Fresh buffers for posting: the cached originals must survive being transferred. */
const copy = (packed: PackedTokens | null): PackedTokens | null => (packed ? { data: packed.data.slice(), offsets: packed.offsets.slice() } : null);

const yieldToEvents = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function tokenize(hl: HighlighterCore, text: string, lang: CodeLang, isCurrent: () => boolean): Promise<Tokenized> {
  if (text.length > MAX_CHARS) return null;
  const lines = toLines(text);
  const out = new Packer();
  let grammarState: GrammarState | undefined;
  for (let start = 0; start < lines.length; start += CHUNK_LINES) {
    const result = hl.codeToTokens(lines.slice(start, start + CHUNK_LINES).join("\n"), {
      lang,
      themes: THEMES,
      defaultColor: false,
      grammarState,
      tokenizeMaxLineLength: 2000,
      tokenizeTimeLimit: 40,
    });
    grammarState = result.grammarState;
    for (const line of result.tokens) out.line(line);
    if (start + CHUNK_LINES < lines.length) {
      await yieldToEvents();
      if (!isCurrent()) return ABORTED;
    }
  }
  return out.build();
}

async function side(hl: HighlighterCore, key: "old" | "new", text: string, lang: CodeLang, isCurrent: () => boolean): Promise<Tokenized> {
  const hit = cache[key];
  if (hit && hit.lang === lang && hit.text === text) return hit.lines;
  const lines = await tokenize(hl, text, lang, isCurrent);
  if (lines !== ABORTED) cache[key] = { lang, text, lines };
  return lines;
}

async function ready(lang: CodeLang): Promise<HighlighterCore> {
  const hl = await getHighlighter();
  if (!loaded.has(lang)) {
    await hl.loadLanguage(LANGS[lang]);
    loaded.add(lang);
  }
  return hl;
}

export async function warmUp(lang: CodeLang): Promise<void> {
  await ready(lang);
}

/** Tokenizes both sides; resolves null if a newer request superseded this one mid-way. */
export async function highlightPair(original: string, modified: string, lang: CodeLang, isCurrent: () => boolean): Promise<SyntaxPayload | null> {
  const hl = await ready(lang);
  if (!isCurrent()) return null;
  const oldLines = await side(hl, "old", original, lang, isCurrent);
  if (oldLines === ABORTED || !isCurrent()) return null;
  const newLines = await side(hl, "new", modified, lang, isCurrent);
  if (newLines === ABORTED || !isCurrent()) return null;
  return { palette: palette.slice(), old: copy(oldLines), new: copy(newLines) };
}
