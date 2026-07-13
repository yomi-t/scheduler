"use client";

import { useId, useRef, useState } from "react";
import {
  formatDateLabel,
  slotKey,
  slotStartLabel,
  timeToMinutes,
  type SlotState,
} from "@/lib/slots";
import styles from "./AvailabilityEditor.module.css";

type Props = {
  dates: string[];
  slotsPerDay: number;
  startTime: string;
  selected: Map<string, SlotState>;
  onChange: (next: Map<string, SlotState>) => void;
};

type CellPos = { row: number; col: number };

export default function AvailabilityEditor({
  dates,
  slotsPerDay,
  startTime,
  selected,
  onChange,
}: Props) {
  const gridId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<CellPos>({ row: 0, col: 0 });
  const [hasFocus, setHasFocus] = useState(false);
  const [paintMode, setPaintMode] = useState<SlotState>("available");
  // Shift+クリック / Space の矩形適用の基点。state は直前の操作で適用した値。
  const anchorRef = useRef<(CellPos & { state: SlotState | null }) | null>(null);

  const cellId = (row: number, col: number) => `${gridId}-${row}-${col}`;

  function applyToggle(row: number, col: number) {
    const key = slotKey(dates[row], col);
    const next = new Map(selected);
    const currentState = next.get(key);
    if (currentState === paintMode) {
      next.delete(key);
      anchorRef.current = { row, col, state: null };
    } else {
      next.set(key, paintMode);
      anchorRef.current = { row, col, state: paintMode };
    }
    onChange(next);
  }

  function applyRectangle(row: number, col: number) {
    const anchor = anchorRef.current;
    if (!anchor) {
      applyToggle(row, col);
      return;
    }
    const next = new Map(selected);
    const [r1, r2] = [Math.min(anchor.row, row), Math.max(anchor.row, row)];
    const [c1, c2] = [Math.min(anchor.col, col), Math.max(anchor.col, col)];
    if (anchor.state === null) {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const key = slotKey(dates[r], c);
          next.delete(key);
        }
      }
    } else {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const key = slotKey(dates[r], c);
          next.set(key, anchor.state);
        }
      }
    }
    onChange(next);
  }

  function handleCellClick(e: React.MouseEvent, row: number, col: number) {
    containerRef.current?.focus();
    setFocus({ row, col });
    if (e.shiftKey) applyRectangle(row, col);
    else applyToggle(row, col);
  }

  function moveFocus(dRow: number, dCol: number) {
    setFocus((f) => {
      const row = Math.min(Math.max(f.row + dRow, 0), dates.length - 1);
      const col = Math.min(Math.max(f.col + dCol, 0), slotsPerDay - 1);
      document
        .getElementById(cellId(row, col))
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      return { row, col };
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowUp":
        moveFocus(-1, 0);
        break;
      case "ArrowDown":
        moveFocus(1, 0);
        break;
      case "ArrowLeft":
        moveFocus(0, -1);
        break;
      case "ArrowRight":
        moveFocus(0, 1);
        break;
      case " ":
        if (e.shiftKey) applyRectangle(focus.row, focus.col);
        else applyToggle(focus.row, focus.col);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  const startMinutes = timeToMinutes(startTime);

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.modeButton} ${paintMode === "available" ? styles.active : ""}`}
          onClick={() => setPaintMode("available")}
          title="○(参加可能)で塗る"
        >
          ◯
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${paintMode === "maybe" ? styles.active : ""}`}
          onClick={() => setPaintMode("maybe")}
          title="△(条件付き)で塗る"
        >
          △
        </button>
      </div>
      <div
        ref={containerRef}
        className={styles.grid}
        style={{
          gridTemplateColumns: `88px repeat(${slotsPerDay}, minmax(24px, 1fr))`,
        }}
        role="grid"
        aria-label="参加可能な時間の選択"
        tabIndex={0}
        aria-activedescendant={hasFocus ? cellId(focus.row, focus.col) : undefined}
        onKeyDown={handleKeyDown}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
      >
        <div role="row" className={styles.headerRow}>
          <div role="columnheader" className={styles.corner} />
          {Array.from({ length: slotsPerDay }, (_, col) => {
            const label = slotStartLabel(startTime, col);
            const onHour = (startMinutes + col * 30) % 60 === 0;
            return (
              <div
                key={col}
                role="columnheader"
                className={`${styles.timeHeader} ${onHour ? styles.onHour : ""}`}
              >
                {onHour ? <span>{label}</span> : null}
              </div>
            );
          })}
        </div>

        {dates.map((date, row) => (
          <div role="row" key={date} className={styles.row}>
            <div role="rowheader" className={styles.dateHeader}>
              {formatDateLabel(date)}
            </div>
            {Array.from({ length: slotsPerDay }, (_, col) => {
              const key = slotKey(date, col);
              const state = selected.get(key);
              const isFocused =
                hasFocus && focus.row === row && focus.col === col;
              return (
                <div
                  key={col}
                  id={cellId(row, col)}
                  role="gridcell"
                  aria-selected={state !== undefined}
                  data-state={state}
                  title={`${formatDateLabel(date)} ${slotStartLabel(startTime, col)}〜${slotStartLabel(startTime, col + 1)}`}
                  className={[
                    styles.cell,
                    state ? styles.filled : "",
                    isFocused ? styles.focused : "",
                  ].join(" ")}
                  onClick={(e) => handleCellClick(e, row, col)}
                >
                  {state === "available" && <span className={styles.mark}>◯</span>}
                  {state === "maybe" && <span className={styles.mark}>△</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className={styles.hint}>
        ボタンで○/△を切り替え、クリックで塗る(同じマスをクリックで未選択に) /
        Shift+クリックで直前のマスから矩形選択 / 矢印キーで移動、Space で塗る
      </p>
    </div>
  );
}
