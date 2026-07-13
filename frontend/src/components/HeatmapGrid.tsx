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

type AvailabilityEntry = {
  available: string[];
  maybe: string[];
};

export default function HeatmapGrid({
  dates,
  slotsPerDay,
  startTime,
  participants,
}: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [includeMaybe, setIncludeMaybe] = useState(true);

  const availability = useMemo(() => {
    const map = new Map<string, AvailabilityEntry>();
    for (const p of participants) {
      for (const [date, indices] of Object.entries(p.slots)) {
        for (const i of indices) {
          const key = slotKey(date, i);
          const entry = map.get(key) ?? { available: [], maybe: [] };
          entry.available.push(p.nickname);
          map.set(key, entry);
        }
      }
      for (const [date, indices] of Object.entries(p.maybeSlots)) {
        for (const i of indices) {
          const key = slotKey(date, i);
          const entry = map.get(key) ?? { available: [], maybe: [] };
          entry.maybe.push(p.nickname);
          map.set(key, entry);
        }
      }
    }
    return map;
  }, [participants]);

  const total = participants.length;
  const startMinutes = timeToMinutes(startTime);

  function level(availableCount: number, maybeCount: number): number {
    const count = includeMaybe ? availableCount + maybeCount : availableCount;
    if (count === 0 || total === 0) return 0;
    if (count === total) return 5;
    return Math.min(4, Math.ceil((count / total) * 5));
  }

  function toggleDate(date: string) {
    setExpandedDate((current) => (current === date ? null : date));
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
                  onClick={() => toggleDate(date)}
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
                  const entry = availability.get(slotKey(date, col)) ?? { available: [], maybe: [] };
                  const lv = level(entry.available.length, entry.maybe.length);
                  const timeRange = `${slotStartLabel(startTime, col)}〜${slotStartLabel(startTime, col + 1)}`;
                  const allNames = [...entry.available, ...entry.maybe.map(n => `${n}(△)`)];
                  const displayCount = includeMaybe ? entry.available.length + entry.maybe.length : entry.available.length;
                  return (
                    <div
                      key={col}
                      role="cell"
                      className={styles.cell}
                      data-level={lv}
                      onClick={() => toggleDate(date)}
                      title={
                        `${formatDateLabel(date)} ${timeRange} — ${displayCount}/${total}人` +
                        (allNames.length > 0 ? `: ${allNames.join(", ")}` : "")
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
                          const isAvailable = p.slots[date]?.includes(col) ?? false;
                          const isMaybe = p.maybeSlots[date]?.includes(col) ?? false;
                          let status: "available" | "maybe" | "unavailable" = "unavailable";
                          let label = "―";
                          if (isAvailable) {
                            status = "available";
                            label = "◯";
                          } else if (isMaybe) {
                            status = "maybe";
                            label = "△";
                          }
                          const timeRange = `${slotStartLabel(startTime, col)}〜${slotStartLabel(startTime, col + 1)}`;
                          return (
                            <div
                              key={col}
                              role="cell"
                              className={styles.personCell}
                              data-status={status}
                              title={`${p.nickname}: ${formatDateLabel(date)} ${timeRange} ${label}`}
                            >
                              <span className={styles.statusMark}>{label}</span>
                            </div>
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

      <div className={styles.legend}>
        <div className={styles.legendTop}>
          <div className={styles.legendGradient}>
            <span className={styles.legendLabel}>0人</span>
            {[1, 2, 3, 4, 5].map((lv) => (
              <span key={lv} className={styles.legendSwatch} data-level={lv} />
            ))}
            <span className={styles.legendLabel}>全員</span>
          </div>
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => setIncludeMaybe(!includeMaybe)}
            aria-pressed={includeMaybe}
          >
            {includeMaybe ? "◯+△を含める" : "◯のみ表示"}
          </button>
        </div>
        <span className={styles.legendNote} aria-hidden>
          日付またはマスをクリックすると参加者ごとの内訳が開きます
        </span>
      </div>
    </div>
  );
}
