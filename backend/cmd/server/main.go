package main

import (
	"log"
	"net/http"

	"scheduler-backend/internal/router"
)

func main() {
	h := router.New()
	addr := ":8080"
	log.Printf("Server listening on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, h); err != nil {
		log.Fatalf("server: %v", err)
	}
}
