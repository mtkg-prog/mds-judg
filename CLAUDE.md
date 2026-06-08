# プロジェクト概要
MDS AI判定。人事評価AI採点システム。ミッション（業務目標）のセルフチェックAI採点、360度評価の運用管理、Google Sheets連携のダッシュボードを提供する社内向けWebアプリケーション。

# 技術スタック
- フレームワーク: Next.js 16 (App Router), React 19, TypeScript 5
- DB/ORM: Prisma 6 + PostgreSQL（Supabase Postgres を利用）
- 認証: 自前JWT認証（jose + bcryptjs）、CarrierAuth（外部OAuth連携）の2モード切替
- AI: Google Gemini API（ミッション文のAI採点）
- 外部連携: Google Sheets API（ダッシュボードのミッションデータ取得）
- UI: shadcn/ui (Base UI), Tailwind CSS v4, Lucide React, Recharts
- バリデーション: Zod
- デプロイ: Vercel（standalone output）

# コマンド
- `npm run dev` - 開発サーバ起動（ポート: 3000）
- `npm run build` - ビルド確認（内部で `prisma generate && next build`）
- `npm run lint` - ESLintによるコードチェック
- `npx prisma generate` - Prismaクライアント再生成（スキーマ変更後に実行）
- `npx prisma db push` - スキーマをDBに反映（開発時のマイグレーション代替）
- `npx prisma db seed` - シードデータ投入（管理者・ダミー従業員の作成）

# プロジェクト構成
```
src/
├── app/                    # App Router ページ・API・Server Actions
│   ├── page.tsx            # ダッシュボード（Google Sheets連携）
│   ├── check/              # セルフチェック（AI採点）
│   ├── login/              # ログイン
│   ├── change-password/    # パスワード変更
│   ├── 360/                # 360度評価（従業員向け）
│   │   ├── evaluate/[assignmentId]/  # 評価回答
│   │   └── results/        # 自分の評価結果
│   ├── admin/              # 管理者画面
│   │   ├── employees/      # 従業員管理（一覧・新規・編集）
│   │   ├── accounts/       # アカウント管理（一覧・新規・編集・一括）
│   │   └── 360/            # 360度評価管理（サイクル・割当・結果）
│   ├── actions/            # Server Actions（auth, employees, accounts, change-password）
│   └── api/                # Route Handlers
│       ├── missions/       # ミッションデータ（Sheets連携）
│       ├── scoring/        # AI採点（Gemini）
│       ├── grade/          # 等級情報
│       ├── 360/            # 360度評価API群
│       ├── admin/          # 管理者API（一括処理）
│       ├── auth/carrier/   # CarrierAuth OAuth
│       ├── internal/       # 内部同期API（sync-user, sync-all）
│       ├── health/         # ヘルスチェック
│       └── setup/          # 初期セットアップ
├── components/
│   ├── ui/                 # shadcn/ui コンポーネント
│   ├── layout/             # Header 等のレイアウト
│   ├── dashboard/          # ダッシュボード固有
│   ├── admin/              # 管理画面固有
│   ├── 360/                # 360度評価固有
│   ├── auth/               # 認証関連
│   ├── check/              # セルフチェック固有
│   └── providers/          # SessionProvider 等
├── lib/
│   ├── auth.ts             # 認証コア（JWT検証・セッション管理）
│   ├── prisma.ts           # Prismaクライアント初期化
│   ├── gemini.ts           # Gemini API クライアント
│   ├── google-sheets.ts    # Google Sheets API クライアント
│   └── carrier-auth/       # CarrierAuth 関連ロジック
└── proxy.ts                # リクエスト境界（Next.js 16 の middleware 代替）
prisma/
├── schema.prisma           # データベーススキーマ
└── seed.ts                 # シードデータ
docs/
└── scoring-criteria.md     # AI採点基準（6次元・等級別重み付け）
```

# 認証アーキテクチャ
- `AUTH_PROVIDER` 環境変数で `legacy`（自前認証）と `carrier`（外部OAuth）を切替
- Legacy: email/password → bcrypt → JWT → httpOnly cookie (`session`) + DBセッション
- Carrier: 外部CarrierAuth → OAuth callback → JWT → httpOnly cookie (`carrier_session`)
- `src/proxy.ts` でリクエスト境界（認証チェック・リダイレクト）を処理
- `SessionProvider`（React Context）でクライアント側にユーザー情報を提供
- `ACCESS_KEY` による簡易アクセスゲート機能あり（オプション）

# データベーススキーマ（主要モデル）
- **User** - 認証ユーザー（email, passwordHash, role, mustChangePassword）
- **Employee** - 従業員（employeeNumber, name, department, position, grade, 上司参照）
- **EvaluationCycle** - 360度評価サイクル（name, startDate, endDate, status）
- **EvaluationAssignment** - 評価割当（evaluator, evaluatee, relationship, status）
- **EvaluationResponse** - 評価回答（scores JSON, comment）
- **Session** - サーバーサイドセッション

# コーディングルール
- コンポーネントは関数コンポーネントで記述
- `any` 型の使用禁止（必ず型定義を行う）
- 日本語コメントを必ず残す
- エラー処理を省略しない（try-catch で握りつぶさない）
- 1ファイルの行数は200行を目安とする（2〜3機能実装ごとにリファクタリングを実施し、ファイル肥大化を防ぐこと）
- 「動くものを早く出す（Ship imperfectly）」を優先し、完璧なコードを目指して開発を止めないこと
- フォームの実装とバリデーション検証には必ず Zod を使用すること

# アーキテクチャ・技術選定の方針
- Next.js 16 の App Router + Server Actions を中心に構成する
- データアクセスは Prisma Client を使用する（Supabase Client SDK は使わない）
- 認証は自前実装（jose + bcryptjs）を使用する
- 状態管理は React Context + ローカルステートで対応する（Redux/Zustand は不使用）
- Next.js 16 では middleware ではなく `proxy.ts`（リクエスト境界）を使用する
- MVP段階での過度な外部サービスや複雑なライブラリの導入は避けること

# データベースルール
- 全モデルに `createdAt` / `updatedAt` を必須とする
- Prisma の `@default(now())` と `@updatedAt` で自動記録する
- スキーマ変更後は `npx prisma generate` を必ず実行する
- 開発時のスキーマ反映は `npx prisma db push` を使用する

# Next.js 16 に関する注意
- このプロジェクトは Next.js 16 を使用しており、API や規約が従来と異なる場合がある
- コードを書く前に `node_modules/next/dist/docs/` 内のガイドを確認すること
- `middleware.ts` は非推奨 → `proxy.ts`（リクエスト境界）を使用する

# テストルール
- 新機能には必ずテストを書く
- E2Eテストよりユニットテストを優先する
- テストファイルは `__tests__` または専用ディレクトリに配置する

# Git運用・コミットルール
- main（master）ブランチに直接 commit せず、必ずブランチを切る
- Commit メッセージは Conventional Commits 形式 (feat:, fix:, docs: 等) を用いる

# スタイルガイド
- ファイル名はケバブケース（example-file.ts）
- コンポーネント名はパスカルケース（ExampleComponent.tsx）
- UIコンポーネントは `src/components/ui/` に shadcn/ui 形式で配置する
- 機能別コンポーネントは `src/components/{機能名}/` にまとめる

# セキュリティ・禁止事項
- 新しい npm パッケージの無断追加禁止（事前に用途と安全性を報告し承認を得る）
- `rm -rf` などの危険なコマンドの実行
- `.env` ファイルのコミット
- `.env` や `.env.local` などの機密情報を含む環境変数ファイルをユーザーに要求すること
- `service_role key` の読み取りやユーザーへの提示要求、およびハードコーディング
- ユーザー入力をそのまま SQL 等に埋め込む処理（Prisma のパラメータ化クエリを使用すること）

# 環境変数（主要なもの）
- `POSTGRES_URL` / `DIRECT_URL` - PostgreSQL 接続
- `JWT_SECRET` - JWT署名キー
- `AUTH_PROVIDER` - 認証モード（`legacy` | `carrier`）
- `GEMINI_API_KEY` - Google Gemini API キー
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` / `GOOGLE_SHEETS_SPREADSHEET_ID` - Google Sheets連携
- `ACCESS_KEY` - 簡易アクセスゲート（オプション）

# 進捗ログ
- 作業終了時に `.manual/progress.md` に状況を記録する
