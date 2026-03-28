package handler

import (
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"sync"
)

//go:embed templates/* static/*
var embeddedFS embed.FS

var (
	initOnce sync.Once
	router   http.Handler
)

const maxFormBytes int64 = 1 << 20

type DiffLine struct {
	OldLine int
	NewLine int
	Kind    string
	Marker  string
	Text    string
}

type PageData struct {
	Title     string
	Original  string
	Modified  string
	DiffLines []DiffLine
	HasResult bool
	Error     string
}

func InitApp() {
	initOnce.Do(func() {
		router = newRouter()
	})
}

func GetRouter() http.Handler {
	if router == nil {
		InitApp()
	}
	return router
}

func newRouter() http.Handler {
	mux := http.NewServeMux()

	tmpl := template.Must(template.ParseFS(embeddedFS, "templates/*.html"))

	if staticFS, err := fs.Sub(embeddedFS, "static"); err == nil {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))
	} else {
		log.Printf("failed to load static assets: %v", err)
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			renderPage(w, tmpl, http.StatusOK, PageData{Title: "diff.ashref.tn"})
		case http.MethodPost:
			r.Body = http.MaxBytesReader(w, r.Body, maxFormBytes)
			if err := r.ParseForm(); err != nil {
				status := http.StatusBadRequest
				message := "Invalid input. Please try again."
				if strings.Contains(err.Error(), "request body too large") {
					status = http.StatusRequestEntityTooLarge
					message = "Input too large. Keep total text under 1MB."
				}
				renderPage(w, tmpl, status, PageData{
					Title: "diff.ashref.tn",
					Error: message,
				})
				return
			}

			original := r.FormValue("original")
			modified := r.FormValue("modified")
			lines := buildDiffLines(original, modified)

			renderPage(w, tmpl, http.StatusOK, PageData{
				Title:     "diff.ashref.tn",
				Original:  original,
				Modified:  modified,
				DiffLines: lines,
				HasResult: true,
			})
		default:
			w.Header().Set("Allow", "GET, POST")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	return mux
}

func renderPage(w http.ResponseWriter, tmpl *template.Template, status int, data PageData) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	if err := tmpl.ExecuteTemplate(w, "index.html", data); err != nil {
		log.Printf("template render error: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

func buildDiffLines(original, modified string) []DiffLine {
	a := splitLines(normalizeNewlines(original))
	b := splitLines(normalizeNewlines(modified))

	m := len(a)
	n := len(b)

	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else if dp[i-1][j] >= dp[i][j-1] {
				dp[i][j] = dp[i-1][j]
			} else {
				dp[i][j] = dp[i][j-1]
			}
		}
	}

	rev := make([]DiffLine, 0, m+n)
	i := m
	j := n

	for i > 0 || j > 0 {
		if i > 0 && j > 0 && a[i-1] == b[j-1] {
			rev = append(rev, DiffLine{OldLine: i, NewLine: j, Kind: "context", Marker: " ", Text: a[i-1]})
			i--
			j--
			continue
		}

		if j > 0 && (i == 0 || dp[i][j-1] >= dp[i-1][j]) {
			rev = append(rev, DiffLine{OldLine: 0, NewLine: j, Kind: "add", Marker: "+", Text: b[j-1]})
			j--
			continue
		}

		if i > 0 {
			rev = append(rev, DiffLine{OldLine: i, NewLine: 0, Kind: "remove", Marker: "-", Text: a[i-1]})
			i--
		}
	}

	for left, right := 0, len(rev)-1; left < right; left, right = left+1, right-1 {
		rev[left], rev[right] = rev[right], rev[left]
	}

	return rev
}

func normalizeNewlines(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	return strings.ReplaceAll(s, "\r", "\n")
}

func splitLines(s string) []string {
	if s == "" {
		return []string{}
	}
	return strings.Split(s, "\n")
}
