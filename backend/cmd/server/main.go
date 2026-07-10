package main

import (
	"fmt"
	"log"
	"net/http"
	"scheduler-backend/internal/router"
)

func main() {
	mux := router.New()
	port := ":8080"

	fmt.Printf("Server listening on http://localhost%s\n", port)
	fmt.Println("Health check: http://localhost:8080/api/health")

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
