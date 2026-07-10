# scheduler

時間帯を含む、会議日程調整 Web アプリ。

## クイックスタート

### セットアップ

```bash
# フロントエンド
cd frontend
npm install
cp .env.example .env.local

# バックエンド（ダウンロードのみ、現在は依存なし）
cd ../backend
go mod download  # optional
```

### 開発

ターミナル1:
```bash
cd backend
go run ./cmd/server
```

ターミナル2:
```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### ビルド

```bash
# フロントエンド
cd frontend
npm run build
# 出力: frontend/out/

# バックエンド
cd ../backend
go build ./...
```

## デプロイ

- **フロントエンド**: Cloudflare Pages（`frontend/out` を deploy）
- **バックエンド**: Vercel Functions（`backend/api/index.go`）

詳細は [AGENTS.md](./AGENTS.md) を参照。

## AI 向けドキュメント

[AGENTS.md](./AGENTS.md) に AI（Claude Code）向けの詳細な指示・ガイドラインを集約しています。

## プロジェクト構成

```
scheduler/
├── frontend/     # Next.js
├── backend/      # Go
├── AGENTS.md     # AI ガイドライン（詳細）
├── README.md     # このファイル
└── CLAUDE.md     # Claude Code が読み込む（@AGENTS.md のみ）
```
