package main

import (
	"log"
	"net/http"
	"os"

	handler "diff.ashref.tn/api"
)

func main() {
	handler.InitApp()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, handler.GetRouter()); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
