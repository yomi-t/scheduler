package api

import (
	"net/http"
	"scheduler-backend/internal/router"
)

var mux = router.New()

func Handler(w http.ResponseWriter, r *http.Request) {
	mux.ServeHTTP(w, r)
}
