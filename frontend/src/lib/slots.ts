// 日付は "YYYY-MM-DD"、時刻は "HH:MM"(30分刻み)。
// スロット番号 = その日の startTime からの30分単位のオフセット。

export const SLOT_MINUTES = 30;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function listDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const end = toUTC(endDate).getTime();
  for (let d = toUTC(startDate); d.getTime() <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(fromUTC(d));
  }
  return dates;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function slotCount(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / SLOT_MINUTES;
}

/** スロット番号 → 開始時刻ラベル ("10:30" など) */
export function slotStartLabel(startTime: string, index: number): string {
  return minutesToLabel(timeToMinutes(startTime) + index * SLOT_MINUTES);
}

/** "1/5(月)" 形式 */
export function formatDateLabel(date: string): string {
  const d = toUTC(date);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
}

export function slotKey(date: string, index: number): string {
  return `${date}_${index}`;
}

export function slotsToSet(slots: Record<string, number[]>): Set<string> {
  const set = new Set<string>();
  for (const [date, indices] of Object.entries(slots)) {
    for (const i of indices) set.add(slotKey(date, i));
  }
  return set;
}

export function setToSlots(set: Set<string>): Record<string, number[]> {
  const slots: Record<string, number[]> = {};
  for (const key of set) {
    const at = key.lastIndexOf("_");
    const date = key.slice(0, at);
    const index = Number(key.slice(at + 1));
    (slots[date] ??= []).push(index);
  }
  for (const indices of Object.values(slots)) indices.sort((a, b) => a - b);
  return slots;
}

/** 30分刻みの時刻文字列一覧 (from 〜 to、両端含む) */
export function timeOptions(fromMinutes: number, toMinutes: number): string[] {
  const options: string[] = [];
  for (let m = fromMinutes; m <= toMinutes; m += SLOT_MINUTES) {
    options.push(minutesToLabel(m));
  }
  return options;
}
