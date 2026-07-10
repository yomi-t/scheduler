'use client';

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", background: "linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)" }}>
      <h1 style={{ fontSize: "3.5rem", fontWeight: 700, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        scheduler
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "3rem", maxWidth: "500px", lineHeight: 1.6 }}>
        時間帯を含む、会議日程調整アプリ。プロジェクトを作成して、参加者の予定を集約します。
      </p>
      <button
        onClick={() => {
          // 後続タスクで実装
        }}
        disabled
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1rem",
          fontWeight: 600,
          borderRadius: "0.375rem",
          border: "1px solid #ddd",
          background: "#fafafa",
          cursor: "default",
          color: "#999",
        }}
      >
        プロジェクトを作成 (後続タスクで実装)
      </button>
    </main>
  );
}
