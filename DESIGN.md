# diff.achraf.tn — design contract

## 1. Intent

Operate-mode tool. Open the page, land on the diff, use it, leave. No hero, no marketing, no sidebar.
The surface borrows achraf.tn (off-white, Inter, rounded-2xl cards, pill controls) and blank.achraf.tn
(warm paper, film grain, soft layered shadows, Instrument Serif accents). One accent: orange `#E27100`.
No logo and no header: the brand is a small `diff.achraf.tn` link at the left of the status bar. Favicons come from achraf.tn.

## 2. Tokens (`src/index.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f5f4f0` | `#0c0c0b` | page |
| `--card` | `#fdfdfb` | `#141413` | editors, diff panel, popover |
| `--sunken` | `#f0efea` | `#1a1a18` | gutters, collapsed separators, voids |
| `--raised` | `#ffffff` | `#2b2b28` | active segmented pill |
| `--ink` | `#1b1a17` | `#ecEAE4` | text |
| `--muted` | `#57534b` | `#a29d94` | secondary text (AA) |
| `--faint` | `#6f6a61` | `#86817a` | line numbers, meta (AA on bg/card) |
| `--accent` | `#e27100` | `#e27100` | focus rim, focus rings, switches, caret (non-text, ≥3:1) |
| `--accent-ink` | `#a14c00` | `#ff9d45` | orange *text* (AA) |
| `--add` / `--del` | `#1f9d55` / `#e0445f` | `#3ecf7e` / `#ff5c7a` | diff hues, mixed into the card |
| `--add-row` `--add-gutter` `--add-mark` | card + 9 / 15 / 27 % | 9 / 15 / 30 % | line tint, gutter tint, changed-word tint |
| `--del-row` `--del-gutter` `--del-mark` | card + 8 / 13 / 25 % | 9 / 15 / 30 % | same, rose |
| `--add-ink` / `--del-ink` | `#17693b` / `#b12a47` | `#74dba0` / `#ff8fa3` | +/- signs, stats, tinted line numbers |
| `--edge-rest` | bg + 10 % ink | bg + 9 % white | carved-surface outline (opaque, so overlaps never darken) |
| `--lift-near` / `--lift-far` | warm 5 % / 4.5 % | black 40 % / 45 % | carved-surface drop shadows |

Radii: cards `rounded-2xl` (16px), controls `rounded-full`, marks 3px. Spacing: Tailwind 4px scale.
Shadows: carved surfaces use `--lift-*` drop-shadows; `--shadow-card` / `--shadow-float` for small cards and the popover.

## 3. Type

- UI: Inter 400–700, 11.5–13.5px. Labels 12.5px semibold.
- Accent: Instrument Serif (italic) for empty/identical states and "Made by". Tab labels (Original, Modified, Diff) share one sans style: sign, label, muted meta.
- Code: JetBrains Mono 12.75px / 20px line, ligatures off, `tab-size: 4`. Editors and diff share this metric.

## 4. Layout

Editors (global actions sit right-aligned in the carved space beside the Modified tab; beside Original on mobile) (resizable share of the workspace, default 42%) → diff surface → status bar (32px).
The resize handle lives in the diff surface's carved notch. The editors can be hidden (chevron in the diff toolbar,
double-click/Enter on the handle); a summary bar replaces them. Below 768px editors stack and the diff is always unified.

## 5. Carved surfaces (`src/components/Surface.tsx`, `src/styles/surface.css`)

The signature element. A surface is one sheet of paper: a body plus tabs that rise out of its top edge, joined to the
body by **concave fillets** (inverse radius), so the space between tabs reads as carved out of the sheet.

| Use | Shape |
|---|---|
| Editors | one start tab: `− Original · N lines` / `+ Modified · N lines` |
| Diff | start tab (*Diff* + stats) and end tab (view, fold, options, hide); the notch between them is the resize handle |
| OG image | the same tab silhouette as an SVG path |

Rules: tab radius 11px, fillet radius 10px, body radius 16px, tab height 34px. The sheet is painted by a content-free
layer (`.surface-shape`) whose pieces share one opaque fill and overlap by 1px; the outline is four 1px offset
drop-shadows on the union, so it is continuous through every fillet at any DPR, and the layer never repaints while
content scrolls. Fillets are `radial-gradient` quarter-disc holes with a 1px anti-aliasing ramp. Tab widths are
mirrored into `--tab-s` / `--tab-e` by a ResizeObserver. Keyboard focus inside a surface (`[data-rim]`) turns the whole
outline orange with a soft glow (registered `@property` colors, 200ms).

## 6. Primitives (`src/components/ui.tsx`)

`IconButton` (32px round, `data-tip` tooltip, `aria-pressed` = accent-soft), `Segmented` (sliding raised pill),
`Switch` (native checkbox, `role="switch"`). Popover uses the native Popover API.

## 7. Motion

Only state feedback: segmented pill slide (200ms), switch knob, focus rim, tooltip fade (350ms hover delay), empty-state
fade-up (headline, then the two-line specimen diff row by row), popover pop. All disabled under `prefers-reduced-motion`. Nothing delays input.

## 8. Syntax

Two in-house TextMate themes (`src/lib/syntax-themes.ts`): paper-light / paper-dark, tuned to stay legible on the
green/rose tints. Colors arrive from the worker as a palette and are emitted as `.s{n}` classes.
Default language is **Auto**: the worker sniffs the text (shebang, JSON, tags, weighted per-language regexes over the
first 6 KB, all line-bounded so nothing can backtrack across lines) and falls back to plain text when unsure.

## 9. Defaults (GitHub-like)

Unified view, word highlights, whitespace/case not ignored, no wrapping, 3 lines of collapsed context, Auto syntax.
Stored under `diff:options:v3`.

## 10. Accessibility and accepted debt

- Real `<textarea>`s with visible labels; focus-within ring on editor cards; visible outlines on all controls.
- Diff stats announced through a persistent `aria-live="polite"` region.
- Accepted: the diff rows are presentational (no table semantics); screen-reader users get stats and the patch copy.
- Accepted: in no-wrap mode the split view scrolls horizontally as one surface, not per side.
