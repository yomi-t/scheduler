"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  addParticipant,
  getProject,
  updateParticipant,
  type ParticipantInput,
  type ProjectDetail,
} from "@/lib/api";
import { parseProjectId, shareUrl } from "@/lib/paths";
import {
  formatDateLabel,
  listDates,
  slotCount,
  slotsToSet,
  setToSlots,
} from "@/lib/slots";
import AvailabilityEditor from "@/components/AvailabilityEditor";
import HeatmapGrid from "@/components/HeatmapGrid";
import ShareLink from "@/components/ShareLink";
import styles from "./project.module.css";

type Editing = {
  participantId: string | null; // null = 新規
  nickname: string;
  comment: string;
  selected: Set<string>;
};

const noopSubscribe = () => () => {};

export default function ProjectPage() {
  // 静的書き出しでは /project/<id> は SPA フォールバックで配信されるため、
  // id は URL パス(外部システム)から読む。プリレンダー時は undefined。
  const projectId = useSyncExternalStore(
    noopSubscribe,
    () => parseProjectId(window.location.pathname),
    () => undefined,
  );
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let stale = false;
    getProject(projectId).then(
      (detail) => {
        if (stale) return;
        setData(detail);
        setLoadError(null);
      },
      (err: unknown) => {
        if (stale) return;
        setLoadError(
          err instanceof Error ? err.message : "読み込みに失敗しました",
        );
      },
    );
    return () => {
      stale = true;
    };
  }, [projectId]);

  const dates = useMemo(
    () => (data ? listDates(data.startDate, data.endDate) : []),
    [data],
  );
  const slotsPerDay = data ? slotCount(data.startTime, data.endTime) : 0;

  function startNew() {
    setSaveError(null);
    setEditing({
      participantId: null,
      nickname: "",
      comment: "",
      selected: new Set(),
    });
  }

  function startEdit(participantId: string) {
    const p = data?.participants.find((x) => x.id === participantId);
    if (!p) return;
    setSaveError(null);
    setEditing({
      participantId,
      nickname: p.nickname,
      comment: p.comment,
      selected: slotsToSet(p.slots),
    });
  }

  async function save() {
    if (!editing || !projectId) return;
    if (!editing.nickname.trim()) {
      setSaveError("ニックネームを入力してください");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const input: ParticipantInput = {
      nickname: editing.nickname.trim(),
      comment: editing.comment,
      slots: setToSlots(editing.selected),
    };
    try {
      if (editing.participantId) {
        await updateParticipant(projectId, editing.participantId, input);
      } else {
        await addParticipant(projectId, input);
      }
      setData(await getProject(projectId));
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (projectId === undefined) {
    return <main className={styles.page} />;
  }

  if (projectId === null || (loadError && !data)) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound}>
          <h1>プロジェクトが見つかりません</h1>
          <p>{loadError ?? "URL をお確かめください。"}</p>
          <Link href="/">← トップへ戻り、新しく作成する</Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>読み込み中…</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{data.name}</h1>
        <p className={styles.meta}>
          {formatDateLabel(data.startDate)} 〜 {formatDateLabel(data.endDate)}
          <span className={styles.metaDivider}>|</span>
          {data.startTime} 〜 {data.endTime}(30分きざみ)
        </p>
        <ShareLink url={shareUrl(data.id)} />
      </header>

      {editing ? (
        <section className={styles.card} aria-label="参加時間の入力">
          <div className={styles.cardHead}>
            <h2>
              {editing.participantId ? "回答を編集" : "参加できる時間を入力"}
            </h2>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>ニックネーム</span>
            <input
              type="text"
              value={editing.nickname}
              maxLength={30}
              placeholder="例: たろう"
              onChange={(e) =>
                setEditing({ ...editing, nickname: e.target.value })
              }
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>参加できる時間(緑に塗る)</span>
            <p className={styles.inputTip}>
              Tip: 1つ目のマスをクリックしてから Shift+クリックすると、間のマスをまとめて選択できます。
            </p>
            <AvailabilityEditor
              dates={dates}
              slotsPerDay={slotsPerDay}
              startTime={data.startTime}
              selected={editing.selected}
              onChange={(next) => setEditing({ ...editing, selected: next })}
            />
          </div>

          <label className={styles.field}>
            <span className={styles.label}>備考(自由入力)</span>
            <textarea
              rows={3}
              value={editing.comment}
              maxLength={500}
              placeholder="例: 水曜は21時までなら参加できます"
              onChange={(e) =>
                setEditing({ ...editing, comment: e.target.value })
              }
            />
          </label>

          {saveError && (
            <p className={styles.error} role="alert">
              {saveError}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={save}
              disabled={saving}
            >
              {saving ? "保存中…" : editing.participantId ? "更新する" : "登録する"}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.card} aria-label="集計">
            <div className={styles.cardHead}>
              <h2>みんなの空き状況</h2>
              <button type="button" className={styles.primary} onClick={startNew}>
                ＋ 参加できる時間を入力
              </button>
            </div>
            {data.participants.length === 0 ? (
              <p className={styles.empty}>
                まだ回答がありません。最初の参加者として、あなたの空き時間を塗ってみましょう。
              </p>
            ) : (
              <HeatmapGrid
                dates={dates}
                slotsPerDay={slotsPerDay}
                startTime={data.startTime}
                participants={data.participants}
              />
            )}
          </section>

          {data.participants.length > 0 && (
            <section className={styles.card} aria-label="参加者">
              <div className={styles.cardHead}>
                <h2>回答済み({data.participants.length}人)</h2>
              </div>
              <ul className={styles.people}>
                {data.participants.map((p) => (
                  <li key={p.id} className={styles.person}>
                    <div className={styles.personBody}>
                      <span className={styles.personName}>{p.nickname}</span>
                      {p.comment && (
                        <p className={styles.personComment}>{p.comment}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => startEdit(p.id)}
                    >
                      編集
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
