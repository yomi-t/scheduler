package server

import (
	"net/http"

	"scheduler-backend/internal/router"
)

func NewHandler() http.Handler {
	return router.New()
}
