import type { CodeLang, ResolvedLang } from "./protocol";

// Worker-only language sniffing for the "Auto" syntax option. Cheap by construction: a few dozen
// regexes over the first few KB, so it can run on every diff without anyone noticing.

const SAMPLE_CHARS = 6000;
/** A winner needs at least this much evidence, and a clear lead over the runner-up. */
const MIN_SCORE = 5;
const MIN_LEAD = 1.25;

/** [pattern (global), weight per match, max matches counted]. */
type Rule = readonly [RegExp, number, number];

const RULES: Readonly<Record<Exclude<CodeLang, "tsx" | "jsx" | "json" | "html">, readonly Rule[]>> = {
  typescript: [
    [/:\s*(?:string|number|boolean|void|unknown|any|never|Record<|Promise<|readonly\s)/g, 3, 4],
    [/^[ \t]*(?:export[ \t]+)?(?:interface|type|enum)[ \t]+[A-Z]\w*/gm, 4, 3],
    [/\b(?:as const|satisfies|implements|private|public|readonly)\b/g, 2, 3],
    [/\w\??:\s*[A-Z]\w*(?:<[^>\n]*>)?(?:\[\])?\s*[,)=;]/g, 2, 3],
  ],
  javascript: [
    [/^[ \t]*(?:import[ \t].*[ \t]from[ \t]+["']|export[ \t]+(?:default|const|function|class|async)\b)/gm, 2, 4],
    [/\b(?:const|let|var)\s+[\w{[]/g, 1, 5],
    [/=>/g, 1, 4],
    [/\b(?:function\*?\s*\w*\s*\(|require\(["']|module\.exports|console\.\w+|document\.|window\.|await\s)/g, 2, 3],
  ],
  python: [
    [/^[ \t]*(?:async[ \t]+)?def[ \t]+\w+[ \t]*\([^\n]*\)[^\n:]*:[ \t]*$/gm, 4, 3],
    [/^[ \t]*class[ \t]+\w+(?:\([^\n]*\))?:[ \t]*$/gm, 4, 2],
    [/^(?:from[ \t]+[\w.]+[ \t]+)?import[ \t]+[\w., \t]+$/gm, 2, 3],
    [/\b(?:self\.|elif\b|None\b|True\b|False\b|__\w+__)/g, 1, 5],
    [/^[ \t]*(?:if|for|while|with|try|except|else)\b[^\n]*:[ \t]*$/gm, 1, 4],
  ],
  go: [
    [/^package[ \t]+\w+[ \t]*$/gm, 6, 1],
    [/^func[ \t]+(?:\([^)\n]*\)[ \t]*)?\w+[ \t]*\(/gm, 4, 3],
    [/:=/g, 1, 4],
    [/\b(?:fmt|strings|errors|context|http)\.[A-Z]\w*/g, 2, 3],
    [/^import[ \t]+\(/gm, 3, 1],
  ],
  rust: [
    [/\b(?:pub\s+)?fn\s+\w+\s*[<(]/g, 3, 3],
    [/\blet\s+mut\b/g, 4, 2],
    [/^[ \t]*use[ \t]+\w+(?:::[\w{}*, ]+)+;/gm, 4, 2],
    [/\b(?:impl|struct|enum|trait|mod|match)\b[^;\n]*\{/g, 2, 3],
    [/\w+!\(|&(?:mut\s|self\b)|->\s*(?:Self|Result|Option|&|[A-Z])/g, 2, 3],
  ],
  css: [
    [/^[ \t]*[.#:*[\w-][^{};()=\n]*\{[ \t]*$/gm, 2, 4],
    [/^[ \t]+-?[a-z-]+[ \t]*:[ \t]*[^;{}\n]+;[ \t]*$/gm, 1, 6],
    [/@(?:media|import|keyframes|font-face|supports|layer)\b|\bvar\(--/g, 3, 2],
  ],
  sql: [
    [/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(?:TABLE|INDEX|VIEW)|ALTER\s+TABLE|DROP\s+TABLE)\b/g, 3, 3],
    [/\b(?:FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|VALUES|PRIMARY\s+KEY)\b/g, 2, 4],
    [/\b(?:select|insert into|update|delete from|create table)\b[^;\n]*\b(?:from|where|values|set)\b/g, 2, 2],
  ],
  yaml: [
    [/^[\w.-]+:(?:[ \t]+[^\s{;][^;{}\n]*)?$/gm, 1, 6],
    [/^[ \t]+[\w.-]+:(?:[ \t]+[^\s{;][^;{}\n]*)?$/gm, 1, 4],
    [/^[ \t]*-[ \t]+[\w"'][^;{}\n]*$/gm, 1, 3],
    [/^---[ \t]*$/gm, 2, 1],
  ],
  markdown: [
    [/^#{1,6}[ \t]+\S/gm, 2, 3],
    [/^```/gm, 3, 2],
    [/\[[^\]\n]+\]\([^)\n]+\)/g, 2, 2],
    [/^[ \t]*(?:[-*+]|\d+\.)[ \t]+\S/gm, 1, 3],
    [/\*\*[^*\n]+\*\*|`[^`\n]+`/g, 1, 3],
  ],
  bash: [
    [/^[ \t]*(?:if[ \t]+\[|then$|fi$|do$|done$|esac$|elif[ \t]+\[)/gm, 3, 3],
    [/^[ \t]*(?:export[ \t]+\w+=|echo[ \t]|cd[ \t]|sudo[ \t]|set[ \t]+-\w|source[ \t]|brew[ \t]|apt(?:-get)?[ \t]|npm[ \t]|bun[ \t]|git[ \t]|curl[ \t]|chmod[ \t])/gm, 2, 4],
    [/\$\{?\w+\}?|\$\(/g, 1, 4],
    [/\s(?:&&|\|\|)\s|\|\s*(?:grep|awk|sed|xargs)\b/g, 1, 3],
  ],
};

const SHEBANG: readonly (readonly [RegExp, CodeLang])[] = [
  [/^#!.*\b(?:ba|z|da)?sh\b/, "bash"],
  [/^#!.*\bpython/, "python"],
  [/^#!.*\b(?:node|deno|bun)\b/, "javascript"],
];

const JSX = /<\/[A-Za-z][\w.]*>|<[A-Z][\w.]*[\s/>]|\breturn\s*\(\s*</;
const HTML = /^\s*(?:<!doctype html|<html[\s>])|<\/(?:div|span|p|a|li|ul|body|head|section|button|script)>/i;
const JSON_START = /^\s*[[{]/;
const JSON_KEYS = /^[ \t]*"[^"\n]+"[ \t]*:/gm;

const RULE_LANGS = Object.keys(RULES).filter((key): key is keyof typeof RULES => key in RULES);

function score(sample: string, rules: readonly Rule[]): number {
  let total = 0;
  for (const [pattern, weight, cap] of rules) {
    pattern.lastIndex = 0;
    let count = 0;
    while (count < cap && pattern.exec(sample) !== null) count++;
    total += count * weight;
  }
  return total;
}

function looksLikeJson(text: string, sample: string): boolean {
  if (!JSON_START.test(sample)) return false;
  JSON_KEYS.lastIndex = 0;
  const keys = sample.match(JSON_KEYS)?.length ?? 0;
  if (keys >= 2) return true;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function detectOne(text: string): CodeLang | null {
  const sample = text.slice(0, SAMPLE_CHARS);
  if (sample.trim().length === 0) return null;
  for (const [pattern, lang] of SHEBANG) if (pattern.test(sample)) return lang;
  if (looksLikeJson(text, sample)) return "json";

  // TypeScript is JavaScript plus types, so the two compete as one "script" family.
  const ranked = RULE_LANGS.filter((lang) => lang !== "javascript")
    .map((lang) => ({ lang, points: lang === "typescript" ? score(sample, RULES.typescript) + score(sample, RULES.javascript) : score(sample, RULES[lang]) }))
    .sort((a, b) => b.points - a.points);
  const [best, second] = ranked;
  if (!best || best.points < MIN_SCORE || best.points < (second?.points ?? 0) * MIN_LEAD) {
    return HTML.test(sample) ? "html" : null;
  }
  if (best.lang !== "typescript") return best.lang;

  const typed = score(sample, RULES.typescript) >= 3;
  if (JSX.test(sample)) return typed ? "tsx" : "jsx";
  if (HTML.test(sample) && !/^[ \t]*(?:import|export|const|let|function)\b/m.test(sample)) return "html";
  return typed ? "typescript" : "javascript";
}

/** Best guess for a pair of texts: the modified side wins, the original is the tie-breaker. */
export function detectLang(original: string, modified: string): ResolvedLang {
  return detectOne(modified) ?? detectOne(original) ?? "plain";
}
