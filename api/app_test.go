package handler

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"testing"
)

func TestBuildDiffLines(t *testing.T) {
	original := "alpha\nbeta\ngamma"
	modified := "alpha\nbeta changed\ngamma\ndelta"

	got := buildDiffLines(original, modified)
	markers := make([]string, 0, len(got))
	texts := make([]string, 0, len(got))
	for _, line := range got {
		markers = append(markers, line.Marker)
		texts = append(texts, line.Text)
	}

	wantMarkers := []string{" ", "-", "+", " ", "+"}
	wantTexts := []string{"alpha", "beta", "beta changed", "gamma", "delta"}

	if !reflect.DeepEqual(markers, wantMarkers) {
		t.Fatalf("markers mismatch: got=%v want=%v", markers, wantMarkers)
	}

	if !reflect.DeepEqual(texts, wantTexts) {
		t.Fatalf("text mismatch: got=%v want=%v", texts, wantTexts)
	}
}

func TestBuildDiffLinesEmpty(t *testing.T) {
	got := buildDiffLines("", "")
	if len(got) != 0 {
		t.Fatalf("expected empty diff, got %d lines", len(got))
	}
}

func TestPostOverLimitReturnsErrorPage(t *testing.T) {
	h := newRouter()
	large := strings.Repeat("a", int(maxFormBytes)+32)
	form := url.Values{}
	form.Set("original", large)
	form.Set("modified", "small")

	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()

	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d", http.StatusRequestEntityTooLarge, rr.Code)
	}

	if !strings.Contains(rr.Body.String(), "Input too large") {
		t.Fatalf("expected oversized-input message, got: %s", rr.Body.String())
	}
}
