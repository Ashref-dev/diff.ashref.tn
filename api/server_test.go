package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServesIndexHTML(t *testing.T) {
	InitApp()
	h := GetRouter()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	ct := rr.Header().Get("Content-Type")
	if !strings.Contains(ct, "text/html") {
		t.Fatalf("expected text/html content-type, got %s", ct)
	}

	if !strings.Contains(rr.Body.String(), "diff.ashref.tn") {
		t.Fatalf("expected body to contain 'diff.ashref.tn'")
	}
}

func TestNoCacheOnIndex(t *testing.T) {
	h := GetRouter()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	cc := rr.Header().Get("Cache-Control")
	if cc != "no-cache" {
		t.Fatalf("expected no-cache on index, got %q", cc)
	}
}

func TestSPAFallback(t *testing.T) {
	h := GetRouter()

	req := httptest.NewRequest(http.MethodGet, "/nonexistent-path", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("SPA fallback: expected 200, got %d", rr.Code)
	}

	if !strings.Contains(rr.Body.String(), "diff.ashref.tn") {
		t.Fatalf("SPA fallback should serve index.html")
	}
}
