package api

import (
	"net/http"

	"scheduler-backend/internal/router"
)

var apiHandler = router.New()

func Handler(w http.ResponseWriter, r *http.Request) {
	apiHandler.ServeHTTP(w, r)
}
