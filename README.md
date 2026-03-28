# diff.ashref.tn

A minimal, fast text diff tool. Paste two strings and get a GitHub-style line-by-line diff. Deployed at [diff.ashref.tn](https://diff.ashref.tn).

## Stack

- **Language**: Go 1.23, stdlib only (`net/http`, `html/template`, `embed`)
- **Frontend**: Server-side rendered HTML + vanilla CSS (no JS framework, no build step)
- **Assets**: Embedded in binary via `go:embed` — single self-contained binary
- **Deploy**: Docker (single container, ~15MB image)

## Quick Start

```bash
docker compose up --build
```

Access at: http://localhost:3005

## Manual (Dev)

```bash
go run .
```

Access at: http://localhost:8080

## Features

- Line-by-line diff with LCS algorithm (no external deps)
- GitHub-style add/remove highlighting
- Line number gutters
- Dark/light mode toggle with localStorage persistence
- 1MB input size limit with graceful error handling
- Fully responsive (mobile + desktop)

## Tests

```bash
go test ./...
```

## Production Deployment

1. Clone to VPS
2. `docker compose up -d --build`
3. Add to Cloudflare tunnel: `diff.ashref.tn → http://127.0.0.1:3005`
4. Reload cloudflared: `sudo systemctl reload cloudflared`

## License

Private — all rights reserved.
