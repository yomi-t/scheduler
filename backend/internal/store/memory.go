package store

import (
	"context"
	"sync"

	"scheduler-backend/internal/model"
)

// Memory は開発用の in-memory ストア。プロセス終了でデータは消える。
type Memory struct {
	mu           sync.RWMutex
	projects     map[string]model.Project
	participants map[string][]model.Participant // projectID → 登録順
}

func NewMemory() *Memory {
	return &Memory{
		projects:     make(map[string]model.Project),
		participants: make(map[string][]model.Participant),
	}
}

func (m *Memory) CreateProject(_ context.Context, p model.Project) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.projects[p.ID] = p
	return nil
}

func (m *Memory) GetProject(_ context.Context, id string) (model.Project, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.projects[id]
	if !ok {
		return model.Project{}, ErrNotFound
	}
	return p, nil
}

func (m *Memory) ListParticipants(_ context.Context, projectID string) ([]model.Participant, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if _, ok := m.projects[projectID]; !ok {
		return nil, ErrNotFound
	}
	list := make([]model.Participant, len(m.participants[projectID]))
	copy(list, m.participants[projectID])
	return list, nil
}

func (m *Memory) AddParticipant(_ context.Context, projectID string, p model.Participant) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.projects[projectID]; !ok {
		return ErrNotFound
	}
	m.participants[projectID] = append(m.participants[projectID], p)
	return nil
}

func (m *Memory) UpdateParticipant(_ context.Context, projectID string, p model.Participant) (model.Participant, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	list := m.participants[projectID]
	for i := range list {
		if list[i].ID == p.ID {
			p.CreatedAt = list[i].CreatedAt
			list[i] = p
			return p, nil
		}
	}
	return model.Participant{}, ErrNotFound
}
