package handler

import (
	"net/http"
	"time"

	"scheduler-backend/internal/model"
)

type participantRequest struct {
	Nickname  string      `json:"nickname"`
	Comment   string      `json:"comment"`
	Slots     model.Slots `json:"slots"`
	MaybeSlots model.Slots `json:"maybeSlots"`
}

func (h *Handler) AddParticipant(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	project, err := h.Store.GetProject(r.Context(), projectID)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	var req participantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Slots == nil {
		req.Slots = model.Slots{}
	}
	if req.MaybeSlots == nil {
		req.MaybeSlots = model.Slots{}
	}
	if err := validateParticipantInput(req.Nickname, req.Comment, req.Slots, req.MaybeSlots, project); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	now := time.Now().UTC()
	p := model.Participant{
		ID:        newID(8),
		Nickname:  req.Nickname,
		Comment:   req.Comment,
		Slots:     req.Slots,
		MaybeSlots: req.MaybeSlots,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := h.Store.AddParticipant(r.Context(), projectID, p); err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) UpdateParticipant(w http.ResponseWriter, r *http.Request) {
	projectID := r.PathValue("id")
	participantID := r.PathValue("pid")
	project, err := h.Store.GetProject(r.Context(), projectID)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	var req participantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Slots == nil {
		req.Slots = model.Slots{}
	}
	if req.MaybeSlots == nil {
		req.MaybeSlots = model.Slots{}
	}
	if err := validateParticipantInput(req.Nickname, req.Comment, req.Slots, req.MaybeSlots, project); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	p := model.Participant{
		ID:        participantID,
		Nickname:  req.Nickname,
		Comment:   req.Comment,
		Slots:     req.Slots,
		MaybeSlots: req.MaybeSlots,
		UpdatedAt: time.Now().UTC(),
	}
	updated, err := h.Store.UpdateParticipant(r.Context(), projectID, p)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
