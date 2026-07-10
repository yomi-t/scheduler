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

## API 設計(実装済み)

- `GET /api/health` — 疎通確認 → `{"status":"ok"}`
- `POST /api/projects` — 作成。body: `{name, startDate, endDate, startTime, endTime}` → `201 Project`
- `GET /api/projects/{id}` — 取得 → `200 Project + {participants: Participant[]}`
- `POST /api/projects/{id}/participants` — 参加者登録。body: `{nickname, comment, slots}` → `201 Participant`
- `PUT /api/projects/{id}/participants/{pid}` — 回答更新(同 body)→ `200 Participant`

データ形式:

- 日付は `"YYYY-MM-DD"`、時刻は `"HH:MM"`(30分刻み、終了は `"24:00"` まで)
- `slots` は `{ "YYYY-MM-DD": [slotIndex, ...] }`。slotIndex = (時刻 − startTime) / 30分
- エラーは `{"error": "日本語メッセージ"}`。バリデーションは `backend/internal/handler/validate.go` に集約
- 集計(人数カウント)はフロント側で計算する。専用エンドポイントはない

## データストア

`backend/internal/store` の `Store` インターフェースに対して2実装:

- **`DATABASE_URL` 未設定** → in-memory(ローカル開発用。プロセス終了で消える)
- **`DATABASE_URL` 設定** → Postgres(Neon)。起動時に `CREATE TABLE IF NOT EXISTS` でスキーマを自動作成
  - Vercel serverless からは Neon の **pooled connection string**(`-pooler` 付きホスト)を使うこと
  - slots は JSONB カラムに保存

## 設計上の注意

### `/project/<id>` のルーティング(実装済み)

Next.js 16 の `output: 'export'` では動的ルート(`dynamicParams: true`)も `rewrites` も使えない(dev でもエラー)。そのため動的ルートは使わず、静的ページ `src/app/project/page.tsx` 1枚で受けている:

- ページはマウント後に `window.location.pathname` から ID を抽出(`src/lib/paths.ts` の `parseProjectId`)
- **本番**: `public/_redirects` の `/project/* /project 200` で SPA フォールバック
- **開発**: `next.config.ts` が `NODE_ENV` で切り替わり、dev では `output: 'export'` を外して同等の `rewrites` を適用
- プロジェクト作成後の遷移は `location.assign`(ハードナビゲーション)。静的ホスティングでは client 遷移が `/project/<id>.txt`(RSC payload)を fetch し、_redirects が HTML を返して壊れるため
- 本番相当の確認は `npx wrangler pages dev out`(_redirects を解釈する)

### 状態管理

React 標準の hooks のみ(useState / useEffect / useSyncExternalStore)。外部ライブラリは導入していない。スロット選択は `Set<"date_index">` で保持し、API との変換は `src/lib/slots.ts` に集約。

### ヒートマップ配色

緑5段階(`--heat-1`〜`--heat-5`、globals.css)。明度単調・コントラスト検証済み。level = `ceil(count / 参加者数 × 5)`。変更時は明度の単調性を保つこと。

## コーディング規約

### 共通

- **コメント最小限**: WHY が非明白な場合のみ。WHAT や HOW は自明なコード構造で表現
- **ファイル/変数命名**: 英語、snake_case（Go）や camelCase（TS）に従う
- **無用な抽象化不可**: 3 行の重複は DRY 化不要。必要になってから

### Go

- **標準ライブラリ優先**: ルーティングは Go 1.22+ の `http.ServeMux` パターン(`"METHOD /path/{param}"`)
- **エラーハンドリング**: 明らかにあり得ないエラーは不処理。システム境界での入力検証のみ
- `gofmt` で自動整形、`go vet` で検査
- 依存ライブラリは必要になってから追加。現在の例外は `github.com/jackc/pgx/v5`(Postgres ドライバ)のみ

### TypeScript

- **strict モード**: `tsconfig.json` の `strict: true`
- **ESLint**: `eslint-config-next` の推奨設定に従う(react-hooks の set-state-in-effect ルールが厳格。effect 内での同期 setState は避け、`.then` コールバックや `useSyncExternalStore` を使う)
- **CSS**: CSS Modules + `globals.css` の CSS 変数(方眼紙テーマ: `--paper` / `--ink` / `--accent` / `--heat-1..5`)
- **フォント**: `next/font/google`(Shippori Mincho B1 / Zen Kaku Gothic New / IBM Plex Mono)。静的書き出しでセルフホストされる

## Cloudflare Pages へのデプロイ

### Git 連携（推奨）

Gitのコミットやプッシュは、指示がない限り、勝手に行わない。

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
4. Environment Variables:
   - `ALLOWED_ORIGIN=https://your-frontend-url.pages.dev`
   - `DATABASE_URL=postgres://...`(Neon の **pooled** connection string。未設定だと in-memory になりデータが永続化されない)
5. デプロイ完了

フロントエンド（Cloudflare Pages）の URL が確定したら、ALLOWED_ORIGIN を更新してください。
フロントエンド側は Cloudflare Pages の環境変数 `NEXT_PUBLIC_API_BASE_URL` に Vercel の URL を設定してビルドします。

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
go mod download

# Postgres (Neon) を使う場合のみ。未設定なら in-memory で動く
export DATABASE_URL="postgres://..."
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

- バックエンド: `cd backend && go test ./...`(httptest による API フロー+バリデーション異常系: `internal/handler/handler_test.go`)
- フロントエンド: 未導入(導入するなら Vitest + React Testing Library)

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
