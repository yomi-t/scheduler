package handler

import (
	"fmt"
	"time"
	"unicode/utf8"

	"scheduler-backend/internal/model"
)

const (
	maxNameLen        = 100
	maxDescriptionLen = 1000
	maxNicknameLen    = 30
	maxCommentLen     = 500
	maxRangeDays      = 62
	slotMinutes       = 30
)

func validateProjectInput(name, description, startDate, endDate, startTime, endTime string) error {
	if n := utf8.RuneCountInString(name); n == 0 || n > maxNameLen {
		return fmt.Errorf("プロジェクト名は1〜%d文字で入力してください", maxNameLen)
	}
	if utf8.RuneCountInString(description) > maxDescriptionLen {
		return fmt.Errorf("説明文は%d文字以内で入力してください", maxDescriptionLen)
	}
	sd, err := parseDate(startDate)
	if err != nil {
		return fmt.Errorf("開始日が不正です")
	}
	ed, err := parseDate(endDate)
	if err != nil {
		return fmt.Errorf("終了日が不正です")
	}
	if ed.Before(sd) {
		return fmt.Errorf("終了日は開始日以降にしてください")
	}
	if ed.Sub(sd) > time.Duration(maxRangeDays-1)*24*time.Hour {
		return fmt.Errorf("日付範囲は%d日以内にしてください", maxRangeDays)
	}
	sm, err := parseTime(startTime)
	if err != nil {
		return fmt.Errorf("開始時刻は30分単位の HH:MM 形式で入力してください")
	}
	em, err := parseTime(endTime)
	if err != nil {
		return fmt.Errorf("終了時刻は30分単位の HH:MM 形式で入力してください")
	}
	if em <= sm {
		return fmt.Errorf("終了時刻は開始時刻より後にしてください")
	}
	return nil
}

func validateParticipantInput(nickname, comment string, slots model.Slots, maybeSlots model.Slots, p model.Project) error {
	if n := utf8.RuneCountInString(nickname); n == 0 || n > maxNicknameLen {
		return fmt.Errorf("ニックネームは1〜%d文字で入力してください", maxNicknameLen)
	}
	if utf8.RuneCountInString(comment) > maxCommentLen {
		return fmt.Errorf("備考は%d文字以内で入力してください", maxCommentLen)
	}
	sd, _ := parseDate(p.StartDate)
	ed, _ := parseDate(p.EndDate)
	slotsPerDay := slotsPerDay(p)

	if err := validateSlotRange(slots, sd, ed, slotsPerDay); err != nil {
		return err
	}
	if err := validateSlotRange(maybeSlots, sd, ed, slotsPerDay); err != nil {
		return err
	}

	if err := validateSlotDuplicate(slots, maybeSlots); err != nil {
		return err
	}
	return nil
}

func validateSlotRange(slots model.Slots, sd time.Time, ed time.Time, slotsPerDay int) error {
	for date, indices := range slots {
		d, err := parseDate(date)
		if err != nil || d.Before(sd) || d.After(ed) {
			return fmt.Errorf("日付 %s は範囲外です", date)
		}
		for _, idx := range indices {
			if idx < 0 || idx >= slotsPerDay {
				return fmt.Errorf("時間スロット %d は範囲外です", idx)
			}
		}
	}
	return nil
}

func validateSlotDuplicate(slots model.Slots, maybeSlots model.Slots) error {
	for date, indices := range slots {
		maybeIndices := maybeSlots[date]
		for _, idx := range indices {
			for _, mIdx := range maybeIndices {
				if idx == mIdx {
					return fmt.Errorf("同じ時間帯を○と△の両方に登録することはできません")
				}
			}
		}
	}
	return nil
}

func slotsPerDay(p model.Project) int {
	sm, _ := parseTime(p.StartTime)
	em, _ := parseTime(p.EndTime)
	return (em - sm) / slotMinutes
}

func parseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

// parseTime は "HH:MM"(30分刻み、"24:00" まで)を0時からの分に変換する。
func parseTime(s string) (int, error) {
	var h, m int
	if _, err := fmt.Sscanf(s, "%02d:%02d", &h, &m); err != nil || len(s) != 5 {
		return 0, fmt.Errorf("invalid time %q", s)
	}
	if h < 0 || h > 24 || m%slotMinutes != 0 || m >= 60 || (h == 24 && m != 0) {
		return 0, fmt.Errorf("invalid time %q", s)
	}
	return h*60 + m, nil
}
