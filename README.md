# diff.achraf.tn

A fast, private text diff. Paste two texts, see every change as you type — split or unified, word/char
highlights, optional syntax colors. Everything runs in the browser; nothing is uploaded.

Live at [diff.achraf.tn](https://diff.achraf.tn).

## Stack

- Bun (package manager / scripts), Vite 8 + React 19 (React Compiler) + TypeScript 7, Tailwind CSS 4
- [jsdiff](https://github.com/kpdecker/jsdiff) in a module Web Worker (`src/diff.worker.ts`)
- [@tanstack/react-virtual](https://tanstack.com/virtual) for the diff rows
- [Shiki](https://shiki.style) (JS regex engine, lazy per language, inside the worker) for syntax colors;
  the default "Auto" language is sniffed in the worker with cheap heuristics (`src/lib/detect.ts`)

## How it stays fast

- Textareas are uncontrolled; typing never waits on React or the diff.
- One diff in flight at a time, latest input wins; results render in a transition.
- Line diff on interned line ids, common prefix/suffix trimmed, lines unique to one side discarded before Myers.
- Intra-line diffs are capped per line (2k chars, bounded edit length) and per comparison.
- Only visible rows are in the DOM. Highlighting runs in chunks, after a short pause, and yields to newer diffs;
  tokens come back as transferable typed arrays, so the main thread never deserializes per-line objects.

## Develop

```bash
bun install
bun run dev       # http://localhost:5173
bun run build     # tsc --noEmit && vite build → dist/
bun run preview   # serve dist/ locally
```

## Deploy (Vercel)

Import the repo in Vercel; `vercel.json` sets the Vite framework preset, `bun install`, `bun run build`, output `dist/`,
immutable caching for `/assets/*` and security headers. No server code, no environment variables.

Design tokens and rules live in [DESIGN.md](DESIGN.md).
