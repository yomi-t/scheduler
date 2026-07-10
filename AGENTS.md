# scheduler - AI ガイドライン

## プロジェクト概要

**scheduler** は、時間帯を含む会議日程調整 Web アプリです。

- ユーザーがプロジェクトを作成し、参加予定者の都合が合う時間を集約します
- 日付と時間（30分単位）の二次元グリッドでスケジュール管理
- 参加可能な時間帯の集約状況を色分け（緑 5段階）で可視化

## モノレポ構成

```
scheduler/
├── frontend/     # Next.js (App Router, src/ ディレクトリ)
│   └── src/app/  # App Router
├── backend/      # Go (Vercel Serverless)
│   ├── api/      # Vercel Functions entry point
│   ├── internal/ # 共有ロジック
│   └── cmd/      # CLI/local server
├── AGENTS.md     # このファイル（AI向け指示の唯一のソース）
└── README.md     # 人間向けドキュメント
```

## デプロイ

### フロントエンド（Cloudflare Pages）

- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `out`（完全な静的書き出し）
- **Root Directory**: `frontend`
- **デプロイ方法**: `wrangler pages deploy out` または GitHub 連携（ダッシュボード）

**理由**: アプリはクライアントサイドアプリで、すべてのデータは Go バックエンドで管理。SSR/RSC 不要のため、完全な静的書き出しで十分。

### バックエンド（Vercel Functions）

- **言語**: Go
- **Root Directory**: `backend`
- **Entrypoint**: `api/index.go` → `func Handler(w http.ResponseWriter, r *http.Request)`

Vercel は `api/` ディレクトリ内の `.go` ファイルを自動検出し、Serverless Functions として部署。

## 開発コマンド

### フロントエンド

```bash
cd frontend

# 開発サーバー起動（localhost:3000）
npm run dev

# 本番ビルド
npm run build

# 静的サイトを確認（ビルド後）
npm start  # または npx http-server out

# Lint
npm run lint
```

### バックエンド

```bash
cd backend

# ローカルサーバー起動（localhost:8080）
go run ./cmd/server

# ビルド確認
go build ./...

# コード検査
go vet ./...

# テスト実行（後続タスク）
go test ./...
```

## CORS 設定

デフォルト: `ALLOWED_ORIGIN=http://localhost:3000`

本番環境では環境変数で設定:
```bash
export ALLOWED_ORIGIN=https://scheduler.example.com
```

## API 設計

### エンドポイント一覧（計画）

- `GET /api/health` — 疎通確認（現在実装済み）
- `POST /api/projects` — プロジェクト作成
- `GET /api/projects/:id` — プロジェクト取得
- `POST /api/projects/:id/participants` — 参加者登録
- `PUT /api/projects/:id/participants/:participantId` — 参加者の回答更新

JSON で request/response。エラーレスポンス: `{"error": "message"}`

## 設計上の注意

### 動的ルート（`/project/[id]`）

Next.js の `output: 'export'` では、`generateStaticParams` で明示的に列挙したパスのみが静的生成されます。動的なプロジェクト ID には対応できません。

**対応方法**（後続タスク実装時）:
1. Cloudflare Pages の `_redirects` ファイルで SPA フォールバック設定:
   ```
   /project/* /index.html 200
   ```
2. クライアント側で `window.location.pathname` から ID を抽出してルーティング
3. またはクライアント側ルーター（TanStack Router など）で完全にハンドル

### 状態管理

後続タスク以降で決定（Zustand, Jotai, Context API など）。現在のスキャフォールドでは未実装。

## コーディング規約

### 共通

- **コメント最小限**: WHY が非明白な場合のみ。WHAT や HOW は自明なコード構造で表現
- **ファイル/変数命名**: 英語、snake_case（Go）や camelCase（TS）に従う
- **無用な抽象化不可**: 3 行の重複は DRY 化不要。必要になってから

### Go

- **標準ライブラリ優先**: Go 1.26 の `net/http` と標準パッケージで開発開始
- **エラーハンドリング**: 明らかにあり得ないエラーは不処理。システム境界での入力検証のみ
- `gofmt` で自動整形、`go vet` で検査
- 依存ライブラリは必要になってから追加（今のところなし）

### TypeScript

- **strict モード**: `tsconfig.json` の `strict: true`
- **ESLint**: `eslint-config-next` の推奨設定に従う
- **CSS**: インラインスタイル（開発初期）→ CSS Modules または Tailwind への段階的移行も検討可能

## Cloudflare Pages へのデプロイ

### Git 連携（推奨）

1. GitHub にコミット/プッシュ
2. Cloudflare ダッシュボード → Pages → GitHub 連携
3. リポジトリ選択、ビルド設定入力:
   - **Production branch**: main
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/out`
4. デプロイ完了

### CLI デプロイ

```bash
cd frontend
npm run build
wrangler pages deploy out
```

## Vercel へのデプロイ

1. GitHub にコミット/プッシュ
2. Vercel ダッシュボード → Add New → Project → GitHub リポジトリ選択
3. Framework: Other / Root Directory: backend
4. Environment Variables: `ALLOWED_ORIGIN=https://your-frontend-url.pages.dev`
5. デプロイ完了

フロントエンド（Cloudflare Pages）の URL が確定したら、ALLOWED_ORIGIN を更新してください。

## ローカル開発フロー

### 初回セットアップ

```bash
# フロントエンド
cd frontend
npm install
cp .env.example .env.local
# .env.local の NEXT_PUBLIC_API_BASE_URL は http://localhost:8080 のまま

# バックエンド（Go）
cd ../backend
go mod download  # 現在は不要だが、依存が増えたら実行
```

### 開発中

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

ブラウザで `http://localhost:3000` にアクセス。

## テスト

後続タスクで実装予定。

- フロントエンド: Jest + React Testing Library
- バックエンド: Go `testing` パッケージ

## トラブルシューティング

### CORS エラーが出ている

- バックエンド起動時に `ALLOWED_ORIGIN` が正しく設定されているか確認
- デフォルトは `http://localhost:3000` なので、フロントエンドをこのポートで起動してください

### ビルドが失敗する

- `cd frontend && npm run build` を実行して詳細を確認
- `next.config.ts` で `output: "export"` が指定されているか確認

### Go コンパイルエラー

- `go mod tidy` で依存関係を同期
- `go vet ./...` で構文チェック
