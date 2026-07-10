package store

import (
	"context"
	"errors"

	"scheduler-backend/internal/model"
)

var ErrNotFound = errors.New("not found")

type Store interface {
	CreateProject(ctx context.Context, p model.Project) error
	GetProject(ctx context.Context, id string) (model.Project, error)
	ListParticipants(ctx context.Context, projectID string) ([]model.Participant, error)
	AddParticipant(ctx context.Context, projectID string, p model.Participant) error
	// UpdateParticipant は更新後の参加者(CreatedAt は保存済みの値)を返す。
	// projectID + participant ID が存在しない場合 ErrNotFound。
	UpdateParticipant(ctx context.Context, projectID string, p model.Participant) (model.Participant, error)
}
