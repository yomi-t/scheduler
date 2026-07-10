package model

import "time"

// Project は日程調整の1案件。日付は "YYYY-MM-DD"、時刻は "HH:MM"(30分刻み)。
type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	StartDate string    `json:"startDate"`
	EndDate   string    `json:"endDate"`
	StartTime string    `json:"startTime"`
	EndTime   string    `json:"endTime"`
	CreatedAt time.Time `json:"createdAt"`
}

// Slots は日付 → その日の30分スロット番号(昇順)。
// 番号 = (時刻 - Project.StartTime) / 30分。
type Slots map[string][]int

type Participant struct {
	ID        string    `json:"id"`
	Nickname  string    `json:"nickname"`
	Comment   string    `json:"comment"`
	Slots     Slots     `json:"slots"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
