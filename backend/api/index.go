package api

import (
	"net/http"

	"scheduler-backend/pkg/server"
)

var apiHandler = server.NewHandler()

func Handler(w http.ResponseWriter, r *http.Request) {
	apiHandler.ServeHTTP(w, r)
}
