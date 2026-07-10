package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"scheduler-backend/internal/model"
)

const schema = `
CREATE TABLE IF NOT EXISTS projects (
	id         TEXT PRIMARY KEY,
	name       TEXT NOT NULL,
	start_date TEXT NOT NULL,
	end_date   TEXT NOT NULL,
	start_time TEXT NOT NULL,
	end_time   TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
	id         TEXT NOT NULL,
	project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	nickname   TEXT NOT NULL,
	comment    TEXT NOT NULL DEFAULT '',
	slots      JSONB NOT NULL DEFAULT '{}',
	created_at TIMESTAMPTZ NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	PRIMARY KEY (project_id, id)
);
`

// Postgres は Neon 等の Postgres を使う本番用ストア。
// Vercel serverless からは Neon の pooled connection string を DATABASE_URL に設定する。
type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(ctx context.Context, databaseURL string) (*Postgres, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	// serverless では1インスタンスの同時実行が限られるため小さく保つ
	cfg.MaxConns = 4
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ensure schema: %w", err)
	}
	return &Postgres{pool: pool}, nil
}

func (s *Postgres) Close() { s.pool.Close() }

func (s *Postgres) CreateProject(ctx context.Context, p model.Project) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO projects (id, name, start_date, end_date, start_time, end_time, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		p.ID, p.Name, p.StartDate, p.EndDate, p.StartTime, p.EndTime, p.CreatedAt)
	return err
}

func (s *Postgres) GetProject(ctx context.Context, id string) (model.Project, error) {
	var p model.Project
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, start_date, end_date, start_time, end_time, created_at
		 FROM projects WHERE id = $1`, id).
		Scan(&p.ID, &p.Name, &p.StartDate, &p.EndDate, &p.StartTime, &p.EndTime, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Project{}, ErrNotFound
	}
	return p, err
}

func (s *Postgres) ListParticipants(ctx context.Context, projectID string) ([]model.Participant, error) {
	if _, err := s.GetProject(ctx, projectID); err != nil {
		return nil, err
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, nickname, comment, slots, created_at, updated_at
		 FROM participants WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []model.Participant{}
	for rows.Next() {
		var p model.Participant
		var slotsJSON []byte
		if err := rows.Scan(&p.ID, &p.Nickname, &p.Comment, &slotsJSON, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(slotsJSON, &p.Slots); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (s *Postgres) AddParticipant(ctx context.Context, projectID string, p model.Participant) error {
	if _, err := s.GetProject(ctx, projectID); err != nil {
		return err
	}
	slotsJSON, err := json.Marshal(p.Slots)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO participants (id, project_id, nickname, comment, slots, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		p.ID, projectID, p.Nickname, p.Comment, slotsJSON, p.CreatedAt, p.UpdatedAt)
	return err
}

func (s *Postgres) UpdateParticipant(ctx context.Context, projectID string, p model.Participant) (model.Participant, error) {
	slotsJSON, err := json.Marshal(p.Slots)
	if err != nil {
		return model.Participant{}, err
	}
	err = s.pool.QueryRow(ctx,
		`UPDATE participants SET nickname = $1, comment = $2, slots = $3, updated_at = $4
		 WHERE project_id = $5 AND id = $6
		 RETURNING created_at`,
		p.Nickname, p.Comment, slotsJSON, p.UpdatedAt, projectID, p.ID).
		Scan(&p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Participant{}, ErrNotFound
	}
	if err != nil {
		return model.Participant{}, err
	}
	return p, nil
}
