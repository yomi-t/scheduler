package router

import (
	"context"
	"log"
	"net/http"
	"os"

	"scheduler-backend/internal/handler"
	"scheduler-backend/internal/store"
)

// New は DATABASE_URL があれば Postgres、なければ in-memory ストアで API を構築する。
func New() http.Handler {
	var s store.Store
	if url := os.Getenv("DATABASE_URL"); url != "" {
		pg, err := store.NewPostgres(context.Background(), url)
		if err != nil {
			log.Fatalf("postgres init: %v", err)
		}
		s = pg
	} else {
		log.Println("DATABASE_URL is not set; using in-memory store (data is not persisted)")
		s = store.NewMemory()
	}
	return WithStore(s)
}

func WithStore(s store.Store) http.Handler {
	h := &handler.Handler{Store: s}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("POST /api/projects", h.CreateProject)
	mux.HandleFunc("GET /api/projects/{id}", h.GetProject)
	mux.HandleFunc("POST /api/projects/{id}/participants", h.AddParticipant)
	mux.HandleFunc("PUT /api/projects/{id}/participants/{pid}", h.UpdateParticipant)

	return cors(mux)
}

func cors(next http.Handler) http.Handler {
	allowed := os.Getenv("ALLOWED_ORIGIN")
	if allowed == "" {
		allowed = "http://localhost:3000"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && (allowed == "*" || origin == allowed) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
