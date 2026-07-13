"use client";

import { useState } from "react";
import { createProject } from "@/lib/api";
import { projectPath } from "@/lib/paths";
import { timeOptions, timeToMinutes } from "@/lib/slots";
import styles from "./page.module.css";

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const START_OPTIONS = timeOptions(0, 23 * 60 + 30);
const END_OPTIONS = timeOptions(30, 24 * 60);

export default function Home() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO(1));
  const [endDate, setEndDate] = useState(todayISO(7));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("20:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("プロジェクト名を入力してください");
      return;
    }
    if (endDate < startDate) {
      setError("終了日は開始日以降にしてください");
      return;
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }
    setSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        startTime,
        endTime,
      });
      // 静的ホスティングの SPA フォールバックと相性の良いハードナビゲーション
      window.location.assign(projectPath(project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.brand}>
          <span className={styles.brandStamp}>予</span>
          scheduler
        </p>
        <h1 className={styles.title}>
          予定は、
          <br />
          マス目で合わせる。
        </h1>
        <p className={styles.lead}>
          日付 × 時間のグリッドに、参加できる時間をみんなで塗るだけ。
          30分きざみの日程調整をリンクひとつで。
        </p>
        <ol className={styles.steps}>
          <li>プロジェクトを作る</li>
          <li>リンクを共有する</li>
          <li>濃い緑のマスに集合</li>
        </ol>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.formTitle}>プロジェクトを作成</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>プロジェクト名</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 新年会の日程調整"
              maxLength={100}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>説明文(任意)</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 候補日は仮押さえです。会場は駅周辺で調整します。"
              maxLength={1000}
            />
          </label>

          <div className={styles.rangeRow}>
            <label className={styles.field}>
              <span className={styles.label}>開始日</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <span className={styles.rangeTilde}>〜</span>
            <label className={styles.field}>
              <span className={styles.label}>終了日</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>

          <div className={styles.rangeRow}>
            <label className={styles.field}>
              <span className={styles.label}>開始時刻</span>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {START_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.rangeTilde}>〜</span>
            <label className={styles.field}>
              <span className={styles.label}>終了時刻</span>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {END_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "作成中…" : "作成して共有リンクを発行"}
          </button>
        </form>
      </section>
    </main>
  );
}
