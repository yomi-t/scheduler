package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"scheduler-backend/internal/model"
	"scheduler-backend/internal/router"
	"scheduler-backend/internal/store"
)

func doJSON(t *testing.T, h http.Handler, method, path string, body any) (*httptest.ResponseRecorder, map[string]json.RawMessage) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	res := map[string]json.RawMessage{}
	if rec.Body.Len() > 0 {
		if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
			t.Fatalf("invalid JSON response %q: %v", rec.Body.String(), err)
		}
	}
	return rec, res
}

func str(t *testing.T, raw json.RawMessage) string {
	t.Helper()
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		t.Fatal(err)
	}
	return s
}

func TestProjectAndParticipantFlow(t *testing.T) {
	h := router.WithStore(store.NewMemory())

	rec, res := doJSON(t, h, "POST", "/api/projects", map[string]string{
		"name":        "новогодний合宿",
		"description": "持ち物と集合場所は後で追記します",
		"startDate":   "2026-01-01",
		"endDate":     "2026-01-09",
		"startTime":   "10:00",
		"endTime":     "20:00",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create project: got %d, body %s", rec.Code, rec.Body.String())
	}
	projectID := str(t, res["id"])
	if len(projectID) != 12 {
		t.Fatalf("project id length: got %q", projectID)
	}

	rec, res = doJSON(t, h, "POST", "/api/projects/"+projectID+"/participants", map[string]any{
		"nickname": "たろう",
		"comment":  "水曜は遅れます",
		"slots":    model.Slots{"2026-01-01": {0, 1, 2}, "2026-01-05": {19}},
		"maybeSlots": model.Slots{"2026-01-02": {5}},
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("add participant: got %d, body %s", rec.Code, rec.Body.String())
	}
	participantID := str(t, res["id"])

	rec, res = doJSON(t, h, "PUT", "/api/projects/"+projectID+"/participants/"+participantID, map[string]any{
		"nickname":   "たろう",
		"comment":    "",
		"slots":      model.Slots{"2026-01-02": {5}},
		"maybeSlots": model.Slots{"2026-01-03": {10}},
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("update participant: got %d, body %s", rec.Code, rec.Body.String())
	}

	rec, res = doJSON(t, h, "GET", "/api/projects/"+projectID, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("get project: got %d", rec.Code)
	}
	if got := str(t, res["description"]); got != "持ち物と集合場所は後で追記します" {
		t.Fatalf("description: got %q", got)
	}
	var participants []model.Participant
	if err := json.Unmarshal(res["participants"], &participants); err != nil {
		t.Fatal(err)
	}
	if len(participants) != 1 {
		t.Fatalf("participants: got %d", len(participants))
	}
	if got := participants[0].Slots["2026-01-02"]; len(got) != 1 || got[0] != 5 {
		t.Fatalf("updated slots not reflected: %v", participants[0].Slots)
	}
	if got := participants[0].MaybeSlots["2026-01-03"]; len(got) != 1 || got[0] != 10 {
		t.Fatalf("updated maybeSlots not reflected: %v", participants[0].MaybeSlots)
	}
}

func TestValidationErrors(t *testing.T) {
	h := router.WithStore(store.NewMemory())

	cases := []struct {
		name string
		body map[string]string
	}{
		{"empty name", map[string]string{"name": "", "startDate": "2026-01-01", "endDate": "2026-01-09", "startTime": "10:00", "endTime": "20:00"}},
		{"description too long", map[string]string{"name": "x", "description": strings.Repeat("あ", 1001), "startDate": "2026-01-01", "endDate": "2026-01-09", "startTime": "10:00", "endTime": "20:00"}},
		{"end before start date", map[string]string{"name": "x", "startDate": "2026-01-09", "endDate": "2026-01-01", "startTime": "10:00", "endTime": "20:00"}},
		{"range too long", map[string]string{"name": "x", "startDate": "2026-01-01", "endDate": "2026-12-31", "startTime": "10:00", "endTime": "20:00"}},
		{"time not on 30min", map[string]string{"name": "x", "startDate": "2026-01-01", "endDate": "2026-01-09", "startTime": "10:15", "endTime": "20:00"}},
		{"end time <= start", map[string]string{"name": "x", "startDate": "2026-01-01", "endDate": "2026-01-09", "startTime": "20:00", "endTime": "10:00"}},
		{"bad date format", map[string]string{"name": "x", "startDate": "1/1", "endDate": "2026-01-09", "startTime": "10:00", "endTime": "20:00"}},
	}
	for _, tc := range cases {
		rec, _ := doJSON(t, h, "POST", "/api/projects", tc.body)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400 (body %s)", tc.name, rec.Code, rec.Body.String())
		}
	}

	rec, res := doJSON(t, h, "POST", "/api/projects", map[string]string{
		"name": "x", "startDate": "2026-01-01", "endDate": "2026-01-09", "startTime": "10:00", "endTime": "20:00",
	})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create project: got %d", rec.Code)
	}
	projectID := str(t, res["id"])

	participantCases := []struct {
		name string
		body map[string]any
	}{
		{"empty nickname", map[string]any{"nickname": "", "slots": model.Slots{}}},
		{"date out of range", map[string]any{"nickname": "a", "slots": model.Slots{"2026-02-01": {0}}}},
		{"slot out of range", map[string]any{"nickname": "a", "slots": model.Slots{"2026-01-01": {20}}}},
		{"negative slot", map[string]any{"nickname": "a", "slots": model.Slots{"2026-01-01": {-1}}}},
		{"duplicate slot and maybeSlot", map[string]any{"nickname": "a", "slots": model.Slots{"2026-01-01": {0}}, "maybeSlots": model.Slots{"2026-01-01": {0}}}},
	}
	for _, tc := range participantCases {
		rec, _ := doJSON(t, h, "POST", "/api/projects/"+projectID+"/participants", tc.body)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400 (body %s)", tc.name, rec.Code, rec.Body.String())
		}
	}

	rec, _ = doJSON(t, h, "GET", "/api/projects/nonexistent00", nil)
	if rec.Code != http.StatusNotFound {
		t.Errorf("missing project: got %d, want 404", rec.Code)
	}

	rec, _ = doJSON(t, h, "PUT", "/api/projects/"+projectID+"/participants/nope1234", map[string]any{
		"nickname": "a", "slots": model.Slots{},
	})
	if rec.Code != http.StatusNotFound {
		t.Errorf("missing participant: got %d, want 404", rec.Code)
	}
}
