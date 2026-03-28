# diff.ashref.tn

A real-time text diff tool with split view, syntax highlighting, and live comparison. Deployed at [diff.ashref.tn](https://diff.ashref.tn).

## Stack

- **Frontend**: Vanilla JS + CSS, built with Vite, using [jsdiff](https://github.com/kpdecker/jsdiff) for diffing and [highlight.js](https://highlightjs.org/) for syntax highlighting
- **Backend**: Go 1.23, stdlib only — serves the SPA via `embed`
- **Deploy**: Docker (multi-stage: Node build -> Go build -> Alpine runtime)

## Features

- Real-time diff as you type (debounced 150ms, no submit button)
- Split view with aligned line-by-line comparison
- Line / Word / Character diff precision
- Syntax highlighting for 18+ languages
- Case sensitivity toggle
- Whitespace trimming
- Text transform (lowercase / uppercase)
- Line wrap toggle
- Dark / Light / System theme with persistence
- Keyboard shortcut: Cmd/Ctrl+Enter to swap texts
- Responsive layout (mobile-friendly)
- Stats bar showing additions, deletions, unchanged counts

## Quick Start

```bash
docker compose up --build
```

Access at: http://localhost:3005

## Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Go server (after frontend build):**
```bash
cd frontend && npm run build && cd ..
go run .
```

Access at: http://localhost:8080

## Tests

```bash
go test ./...
```

## Production Deployment

1. Clone to VPS
2. `docker compose up -d --build`
3. Cloudflare tunnel routes `diff.ashref.tn` to the container

## License

Private — all rights reserved.
