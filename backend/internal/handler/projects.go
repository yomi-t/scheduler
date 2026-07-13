package handler

import (
	"net/http"
	"time"

	"scheduler-backend/internal/model"
	"scheduler-backend/internal/store"
)

type Handler struct {
	Store store.Store
}

type createProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
}

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req createProjectRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := validateProjectInput(req.Name, req.Description, req.StartDate, req.EndDate, req.StartTime, req.EndTime); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	p := model.Project{
		ID:          newID(12),
		Name:        req.Name,
		Description: req.Description,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		CreatedAt:   time.Now().UTC(),
	}
	if err := h.Store.CreateProject(r.Context(), p); err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

type projectResponse struct {
	model.Project
	Participants []model.Participant `json:"participants"`
}

func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.Store.GetProject(r.Context(), id)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	participants, err := h.Store.ListParticipants(r.Context(), id)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, projectResponse{Project: p, Participants: participants})
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
