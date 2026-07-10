"use client";

import { useMemo, useState } from "react";
import type { Participant } from "@/lib/api";
import {
  formatDateLabel,
  slotKey,
  slotStartLabel,
  timeToMinutes,
} from "@/lib/slots";
import styles from "./HeatmapGrid.module.css";

type Props = {
  dates: string[];
  slotsPerDay: number;
  startTime: string;
  participants: Participant[];
};

export default function HeatmapGrid({
  dates,
  slotsPerDay,
  startTime,
  participants,
}: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const availability = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of participants) {
      for (const [date, indices] of Object.entries(p.slots)) {
        for (const i of indices) {
          const key = slotKey(date, i);
          const names = map.get(key) ?? [];
          names.push(p.nickname);
          map.set(key, names);
        }
      }
    }
    return map;
  }, [participants]);

  const total = participants.length;
  const startMinutes = timeToMinutes(startTime);

  function level(count: number): number {
    if (count === 0 || total === 0) return 0;
    return Math.min(5, Math.ceil((count / total) * 5));
  }

  const gridStyle = {
    gridTemplateColumns: `112px repeat(${slotsPerDay}, minmax(24px, 1fr))`,
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid} style={gridStyle} role="table" aria-label="参加可能人数の集計">
        <div role="row" className={styles.row}>
          <div role="columnheader" className={styles.corner} />
          {Array.from({ length: slotsPerDay }, (_, col) => {
            const onHour = (startMinutes + col * 30) % 60 === 0;
            return (
              <div
                key={col}
                role="columnheader"
                className={`${styles.timeHeader} ${onHour ? styles.onHour : ""}`}
              >
                {onHour ? <span>{slotStartLabel(startTime, col)}</span> : null}
              </div>
            );
          })}
        </div>

        {dates.map((date) => {
          const expanded = expandedDate === date;
          return (
            <div key={date} className={styles.dateBlock}>
              <div role="row" className={styles.row}>
                <button
                  type="button"
                  className={`${styles.dateHeader} ${expanded ? styles.dateHeaderOpen : ""}`}
                  onClick={() => setExpandedDate(expanded ? null : date)}
                  aria-expanded={expanded}
                  title={
                    expanded
                      ? "内訳を閉じる"
                      : "クリックで参加者ごとの内訳を表示"
                  }
                >
                  <span className={styles.disclosure} aria-hidden>
                    {expanded ? "▾" : "▸"}
                  </span>
                  {formatDateLabel(date)}
                </button>
                {Array.from({ length: slotsPerDay }, (_, col) => {
                  const names = availability.get(slotKey(date, col)) ?? [];
                  const lv = level(names.length);
                  const timeRange = `${slotStartLabel(startTime, col)}〜${slotStartLabel(startTime, col + 1)}`;
                  return (
                    <div
                      key={col}
                      role="cell"
                      className={styles.cell}
                      data-level={lv}
                      title={
                        `${formatDateLabel(date)} ${timeRange} — ${names.length}/${total}人` +
                        (names.length > 0 ? `: ${names.join(", ")}` : "")
                      }
                    />
                  );
                })}
              </div>

              {expanded && (
                <div className={styles.detail}>
                  {participants.length === 0 ? (
                    <p className={styles.detailEmpty}>まだ回答がありません。</p>
                  ) : (
                    participants.map((p) => (
                      <div role="row" className={styles.row} key={p.id}>
                        <div className={styles.personHeader} title={p.nickname}>
                          {p.nickname}
                        </div>
                        {Array.from({ length: slotsPerDay }, (_, col) => {
                          const ok = p.slots[date]?.includes(col) ?? false;
                          const timeRange = `${slotStartLabel(startTime, col)}〜${slotStartLabel(startTime, col + 1)}`;
                          return (
                            <div
                              key={col}
                              role="cell"
                              className={`${styles.personCell} ${ok ? styles.personOk : ""}`}
                              title={`${p.nickname}: ${formatDateLabel(date)} ${timeRange} ${ok ? "参加可" : "―"}`}
                            />
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.legend} aria-hidden>
        <span className={styles.legendLabel}>0人</span>
        {[1, 2, 3, 4, 5].map((lv) => (
          <span key={lv} className={styles.legendSwatch} data-level={lv} />
        ))}
        <span className={styles.legendLabel}>全員</span>
        <span className={styles.legendNote}>
          日付をクリックすると参加者ごとの内訳が開きます
        </span>
      </div>
    </div>
  );
}
