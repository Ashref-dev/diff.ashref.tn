import type { ThemeRegistration } from "shiki/core";

// Two small TextMate themes tuned to the paper palette (see DESIGN.md → Syntax).
// Colors stay AA on the plain card and remain legible on the green/rose diff tints.

interface Palette {
  readonly fg: string;
  readonly bg: string;
  readonly comment: string;
  readonly punct: string;
  readonly keyword: string;
  readonly string: string;
  readonly constant: string;
  readonly fn: string;
  readonly type: string;
}

function theme(name: string, type: "light" | "dark", p: Palette): ThemeRegistration {
  const rule = (scope: string[], foreground: string) => ({ scope, settings: { foreground } });
  return {
    name,
    type,
    fg: p.fg,
    bg: p.bg,
    settings: [
      { settings: { foreground: p.fg, background: p.bg } },
      rule(["comment", "punctuation.definition.comment", "string.comment"], p.comment),
      rule(["punctuation", "meta.brace", "keyword.operator", "meta.tag.sgml", "punctuation.definition.tag"], p.punct),
      rule(["string", "string.template", "punctuation.definition.string", "markup.inline.raw", "markup.raw"], p.string),
      rule(
        ["constant.numeric", "constant.language", "constant.character", "constant.other", "support.constant", "variable.other.constant", "keyword.other.unit"],
        p.constant,
      ),
      rule(
        ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.operator.expression", "keyword.operator.logical.python", "entity.name.tag", "markup.heading", "entity.name.section"],
        p.keyword,
      ),
      rule(["entity.name.function", "support.function", "meta.function-call entity.name.function", "support.type.property-name", "markup.underline.link", "entity.name.label"], p.fn),
      rule(
        ["entity.name.type", "entity.name.class", "entity.name.namespace", "support.type", "support.class", "entity.other.inherited-class", "entity.other.attribute-name", "storage.type.primitive", "storage.type.builtin"],
        p.type,
      ),
    ],
  };
}

export const paperLight = theme("paper-light", "light", {
  fg: "#2a2824",
  bg: "#fdfdfb",
  comment: "#7f796e",
  punct: "#66615a",
  keyword: "#ad4508",
  string: "#2f7446",
  constant: "#7446a8",
  fn: "#23609f",
  type: "#8a5c00",
});

export const paperDark = theme("paper-dark", "dark", {
  fg: "#e7e4dd",
  bg: "#161615",
  comment: "#8a857c",
  punct: "#a8a399",
  keyword: "#ff9f5a",
  string: "#9dd4a1",
  constant: "#c9a6f7",
  fn: "#8dbcf2",
  type: "#e9c46f",
});
