package handler

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"sync"
)

//go:embed static/*
var embeddedFS embed.FS

var (
	initOnce sync.Once
	router   http.Handler
)

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
	staticFS, err := fs.Sub(embeddedFS, "static")
	if err != nil {
		log.Fatalf("failed to load static assets: %v", err)
	}

	fileServer := http.FileServer(http.FS(staticFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		if path == "/" {
			w.Header().Set("Cache-Control", "no-cache")
			fileServer.ServeHTTP(w, r)
			return
		}

		if f, err := staticFS.Open(path[1:]); err == nil {
			f.Close()
			if len(path) > 8 && path[:8] == "/assets/" {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			fileServer.ServeHTTP(w, r)
			return
		}

		r.URL.Path = "/"
		w.Header().Set("Cache-Control", "no-cache")
		fileServer.ServeHTTP(w, r)
	})
}
