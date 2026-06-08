# MDS AI判定 仕様書

最終更新: 2026-04-03

---

## 1. アプリの概要

### アプリ名
MDS AI判定（人事評価AI採点システム）

### 目的
人事評価プロセスにおける「ミッション（業務目標）の質」を客観的に可視化し、評価業務の効率化・透明性向上を実現する。具体的には以下を解決する。

- **評価の属人化**: ミッション記載の質をAI（Gemini）で定量的に採点し、評価者間のばらつきを軽減
- **360度評価の運用負荷**: 評価サイクルの管理・割当・集計を一元化し、Excel管理の限界を解消
- **評価データの散在**: Google Sheetsのミッションデータをダッシュボードに集約し、全体状況を即座に把握可能にする

### 対象ユーザー
- **一般社員（employee）**: ミッションのセルフチェック、360度評価の回答・結果閲覧
- **上長（manager）**: 上記に加え、部下の評価管理（将来拡張予定）
- **管理者（admin）**: 社員管理、アカウント管理、360度評価サイクルの運営、全データ閲覧

---

## 2. 権限（ロール）設計

### ロール一覧

| ロール | 値 | 説明 |
|--------|-----|------|
| 管理者 | `admin` | システム全体の管理権限を持つ |
| 上長 | `manager` | 一般社員の権限に加え、将来的な管理機能を持つ（現時点では employee と同等） |
| 一般社員 | `employee` | 基本的な閲覧・入力機能のみ |

### 機能別アクセス権限マトリクス

| 機能 | employee | manager | admin |
|------|:--------:|:-------:|:-----:|
| ダッシュボード閲覧 | ○ | ○ | ○ |
| セルフチェック（AI採点） | ○ | ○ | ○ |
| 360度評価 回答 | ○ | ○ | ○ |
| 360度評価 自分の結果閲覧 | ○ | ○ | ○ |
| 社員管理（CRUD） | × | × | ○ |
| アカウント管理（CRUD・一括作成） | × | × | ○ |
| 360度評価サイクル管理 | × | × | ○ |
| 360度評価 全員の結果閲覧 | × | × | ○ |
| パスワードリセット（他者） | × | × | ○ |

### 権限制御の実装箇所

| レイヤー | 方法 |
|---------|------|
| リクエスト境界（`proxy.ts`） | JWT検証 → `/admin` パスは `role !== 'admin'` でリダイレクト |
| サーバーコンポーネント（`admin/layout.tsx`） | `getSession()` → `role !== 'admin'` で `/` にリダイレクト |
| Server Actions | `requireAdmin()` ヘルパーでロールチェック |
| API Route Handlers | `getSession()` → ロール検証（403返却） |

### 認証方式

本システムは2つの認証モードを環境変数 `AUTH_PROVIDER` で切り替える。

| モード | Cookie名 | 方式 | 用途 |
|--------|----------|------|------|
| `legacy` | `session` | Email/Password → bcrypt → JWT | 独立運用・開発環境 |
| `carrier` | `carrier_session` | Google OAuth → CarrierAuth API → JWT | 本番環境（SSO連携） |

### 初回パスワード変更強制
- `mustChangePassword` フラグが `true` のユーザーは、ログイン後に `/change-password` へ強制リダイレクトされる
- 一括作成（CSV）で作成されたアカウントはすべてこのフラグが有効

---

## 3. 機能一覧

### 3.1 ダッシュボード（`/`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | Google Sheetsのミッションデータを取得し、集計・フィルタリングして一覧表示 |
| データソース | Google Sheets API（`missions` シート） |

**機能詳細:**
- 統計カード: 総ミッション数、採点済み数、集計済み数、対象者数
- フィルター: 期間、部署、氏名（テキスト検索）
- 一覧テーブル: 人物単位でグルーピング、クリックでミッション詳細を展開
- 展開時: 各ミッションの6次元スコア（難易度・影響範囲・新規性・課題寄与・立ち位置・実現可能性）と加重ポイント

### 3.2 セルフチェック — AI採点（`/check`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | 社員が自分のミッション内容を入力し、AIが6次元で採点。グレード・グレード給を参考値として算出 |
| AI | Google Gemini API（`gemini-2.5-flash`） |

**機能詳細:**
- 基本情報入力: 役職（Position）、部門種別（DepartmentType）
- ミッション入力: 最大3つ、各ミッションにウェイト（合計100%）
  - M1: ミッション名（10文字以上）
  - M2: 背景・課題とゴール（30文字以上）
  - M3: 内容・難易度（30文字以上）
  - M4: 関係先・役割（30文字以上）
  - M5: 完遂の根拠（30文字以上）
- 入力文字数のリアルタイムバリデーション
- ウェイト合計のリアルタイム表示（100%で緑、それ以外は赤）
- 結果表示: 総合ポイント、判定グレード、グレード給、各次元のスコア（10点満点）、AIコメント、レベルアップのヒント
- データは保存されない（参考値として利用）

### 3.3 360度評価 — 従業員向け（`/360`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | 割り当てられた評価に回答し、自分の結果を閲覧 |

**機能詳細:**
- 未回答一覧: サイクルが `open` かつ自分の割当が `pending` のもの
- 回答フォーム: 各評価次元を1〜5のラジオボタンで回答 + コメント（任意）
  - 評価次元は被評価者の役職グループに応じて動的に変化
  - 提出前に確認ダイアログ、提出後は変更不可
- 回答済み一覧: 提出済みの評価
- 結果閲覧: サイクルが `closed` の場合に自分の360度評価結果を閲覧
  - レーダーチャート（自己評価・上司・同僚・部下の比較）
  - 関係性別の平均スコアバー
  - 匿名コメント一覧（シャッフル済み）

### 3.4 360度評価 — 管理画面（`/admin/360`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | 評価サイクルの作成・管理、評価者割当、結果の全社閲覧 |
| 権限 | admin のみ |

**機能詳細:**
- サイクル管理: 作成（名前・開始日・終了日）、ステータス遷移（draft → open → closed）、削除（draft のみ）
- 評価者割当:
  - 自動割当: 全従業員に上司・部下・同僚・本人の割当を自動生成
  - シートから読込: Google Sheets の `360assign` シートから割当をインポート
  - 割当確認: 被評価者ごとにグルーピングした割当一覧
- サイクル詳細: 割当数・回答済み数・未回答数のカード表示
- 結果一覧: 全従業員の進捗一覧（回答数/割当数）
- 個人結果: 特定従業員の360度評価結果（レーダーチャート・カテゴリ別スコア・コメント）

### 3.5 社員管理（`/admin/employees`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | 社員（Employee）マスタデータの管理 |
| 権限 | admin のみ |

**機能詳細:**
- 一覧: 社員番号、氏名、部署、役職、等級、アカウント有無
- 新規登録: 社員番号、氏名、部署、役職、等級、メールアドレス、上長
- 編集: 全フィールドの変更
- 削除: 確認ダイアログ付き

### 3.6 アカウント管理（`/admin/accounts`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | ログインアカウント（User + Employee）の管理 |
| 権限 | admin のみ |

**機能詳細:**
- 一覧: 社員番号、氏名、メールアドレス、部署、役職、ロール、作成日
- 新規作成: アカウント情報（メール、パスワード、ロール）+ 社員情報（番号、氏名、部署、役職、等級、上長）
- 編集: メール、ロール、社員情報の変更
- パスワードリセット: 管理者が任意のアカウントのパスワードを変更（全セッション無効化付き）
- 一括作成（CSV）: CSVファイルをアップロードし、最大500件のアカウントを一括作成
  - 必須カラム: email, role, employeeNumber, name, department, position, grade
  - 共通初期パスワード設定、`mustChangePassword` フラグ自動ON
  - プレビュー表示（最大20件）、作成結果（成功・スキップ・エラー）
- 削除: 確認ダイアログ付き（セッション削除 → Employee紐付け解除 → User削除）
- 姉妹アプリ同期: アカウント作成・パスワード変更時に外部アプリへ自動同期

### 3.7 認証（`/login`, `/change-password`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | ログイン・ログアウト・パスワード変更 |

**機能詳細:**
- Legacy認証: メール + パスワードフォーム
- Carrier認証: 「Googleアカウントでログイン」ボタン
- パスワード変更: 新パスワード + 確認入力（6文字以上）
- 初回ログイン時のパスワード変更強制

### 3.8 内部API（`/api/internal/`）

| 項目 | 内容 |
|------|------|
| 優先度 | あると便利 |
| 概要 | 姉妹アプリ間のアカウント同期 |
| 認証 | `INTERNAL_API_SECRET` による Bearer トークン認証 |

**機能詳細:**
- `sync-user`: 単一ユーザーの作成・パスワード同期
- `sync-all`: 全ユーザーを姉妹アプリへ一括同期

### 3.9 初期セットアップ（`/api/setup`）

| 項目 | 内容 |
|------|------|
| 優先度 | 必須 |
| 概要 | DBが空の状態から管理者アカウント + ダミーデータを作成 |

**機能詳細:**
- テーブル未存在時は自動でDDLを実行してテーブルを作成
- 管理者アカウント1つ + ダミー社員5名 + 上長関係を作成
- 既にアカウントが存在する場合は403を返す（冪等性保護）

---

## 4. 画面一覧

| # | パス | 画面名 | 権限 | 概要 |
|---|------|--------|------|------|
| 1 | `/` | ダッシュボード | 全ユーザー | ミッション評価データの集計表示 |
| 2 | `/check` | セルフチェック | 全ユーザー | AI採点のシミュレーション |
| 3 | `/login` | ログイン | 未認証 | メール/PW or Google OAuth |
| 4 | `/change-password` | パスワード変更 | 認証済み | 初回ログイン時のPW強制変更 |
| 5 | `/360` | 360度評価トップ | 全ユーザー | 未回答・回答済み一覧、結果へのリンク |
| 6 | `/360/evaluate/[id]` | 評価回答フォーム | 全ユーザー | 360度評価の回答入力 |
| 7 | `/360/results` | 自分の評価結果 | 全ユーザー | 自身の360度評価結果閲覧 |
| 8 | `/admin/employees` | 社員管理 一覧 | admin | 社員一覧テーブル |
| 9 | `/admin/employees/new` | 社員登録 | admin | 社員新規登録フォーム |
| 10 | `/admin/employees/[id]` | 社員編集 | admin | 社員情報編集フォーム |
| 11 | `/admin/accounts` | アカウント管理 一覧 | admin | アカウント一覧テーブル |
| 12 | `/admin/accounts/new` | アカウント作成 | admin | アカウント新規作成フォーム |
| 13 | `/admin/accounts/[id]` | アカウント編集 | admin | アカウント編集 + パスワードリセット |
| 14 | `/admin/accounts/bulk` | アカウント一括作成 | admin | CSV一括インポート |
| 15 | `/admin/360` | 360管理 トップ | admin | サイクル一覧 + 新規作成 |
| 16 | `/admin/360/[cycleId]` | サイクル詳細 | admin | 統計・ステータス管理・操作ボタン |
| 17 | `/admin/360/[cycleId]/assign` | 評価者割当 | admin | 割当一覧（被評価者別） |
| 18 | `/admin/360/[cycleId]/results` | 結果一覧 | admin | 全従業員の進捗テーブル |
| 19 | `/admin/360/[cycleId]/results/[empId]` | 個人結果 | admin | 特定従業員の詳細結果 |

---

## 5. データ構造

### ER図（概念）

```
User 1---0..1 Employee
User 1---* Session
Employee *---1 Employee (manager/subordinates 自己参照)
Employee 1---* EvaluationAssignment (as evaluator)
Employee 1---* EvaluationAssignment (as evaluatee)
EvaluationCycle 1---* EvaluationAssignment
EvaluationCycle 1---* EvaluationResponse
EvaluationAssignment 1---0..1 EvaluationResponse
```

### テーブル定義

#### User（ユーザー）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | ユーザーID |
| email | String | unique | メールアドレス |
| passwordHash | String | - | bcryptハッシュ |
| role | String | default: "employee" | "admin" / "manager" / "employee" |
| mustChangePassword | Boolean | default: false | 初回パスワード変更フラグ |
| createdAt | DateTime | default: now() | 作成日時 |
| updatedAt | DateTime | @updatedAt | 更新日時 |

#### Employee（社員）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | 社員ID |
| employeeNumber | String | unique | 社員番号 |
| name | String | - | 氏名 |
| department | String | - | 部署 |
| position | String | - | 役職 |
| grade | String | - | 等級（A1, L2 等） |
| email | String | unique | メールアドレス |
| userId | String? | unique, FK(User) | 紐付くユーザーID |
| managerId | String? | FK(Employee) | 上長の社員ID |
| createdAt | DateTime | default: now() | 作成日時 |
| updatedAt | DateTime | @updatedAt | 更新日時 |

#### EvaluationCycle（評価サイクル）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | サイクルID |
| name | String | - | サイクル名 |
| startDate | DateTime | - | 開始日 |
| endDate | DateTime | - | 終了日 |
| status | String | default: "draft" | "draft" / "open" / "closed" |
| createdAt | DateTime | default: now() | 作成日時 |
| updatedAt | DateTime | @updatedAt | 更新日時 |

#### EvaluationAssignment（評価割当）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | 割当ID |
| cycleId | String | FK(EvaluationCycle), CASCADE | サイクルID |
| evaluatorId | String | FK(Employee) | 評価者の社員ID |
| evaluateeId | String | FK(Employee) | 被評価者の社員ID |
| relationship | String | - | "上司" / "同僚" / "部下" / "本人" |
| status | String | default: "pending" | "pending" / "submitted" |
| createdAt | DateTime | default: now() | 作成日時 |
| updatedAt | DateTime | @updatedAt | 更新日時 |

※ `cycleId + evaluatorId + evaluateeId` に複合ユニーク制約

#### EvaluationResponse（評価回答）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | 回答ID |
| assignmentId | String | unique, FK(EvaluationAssignment), CASCADE | 割当ID |
| cycleId | String | FK(EvaluationCycle) | サイクルID |
| evaluateeId | String | - | 被評価者の社員ID |
| relationship | String | - | 関係性（非正規化） |
| scores | String | - | JSON文字列（`{ "dimensionKey": 1-5, ... }`） |
| comment | String | default: "" | コメント |
| submittedAt | DateTime | default: now() | 提出日時 |

※ `cycleId + evaluateeId` にインデックス

#### Session（セッション）
| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | String | PK, cuid | セッションID |
| userId | String | FK(User), CASCADE | ユーザーID |
| expiresAt | DateTime | - | 有効期限 |
| createdAt | DateTime | default: now() | 作成日時 |

### 外部データソース

| データソース | 内容 | 取得方法 |
|-------------|------|---------|
| Google Sheets `missions` シート | ミッションデータ（行単位のスコア・グレード情報） | Google Sheets API (readonly) |
| Google Sheets `master` シート | 役職グループ、グレード閾値、グレード給テーブル | Google Sheets API (readonly) |
| Google Sheets `360eval` シート | 360度評価の次元定義（評価項目） | Google Sheets API (readonly) |
| Google Sheets `360assign` シート | 360度評価の割当マスタ | Google Sheets API (readonly) |

---

## 6. 非機能要件

### 対応ブラウザ
- Google Chrome（最新版）
- Microsoft Edge（最新版）
- Safari（最新版）
- モバイルブラウザ（レスポンシブ対応済み）

### 想定ユーザー数
- 社内利用: 数十〜数百名規模
- 同時接続: 最大50名程度

### 対応言語
- 日本語のみ

### パフォーマンス
- ダッシュボード: Google Sheets APIの応答に依存（キャッシュなし、毎回取得）
- AI採点: Gemini APIの応答に依存（1ミッションあたり数秒）
- 360度評価: Prisma経由のDB問い合わせ（通常1秒以内）

### セキュリティ
- 認証: JWT（httpOnly Cookie）+ サーバーサイドセッション（DB管理）
- パスワード: bcrypt（ソルトラウンド10）でハッシュ化
- 管理画面: リクエスト境界 + レイアウト + API の3層でアクセス制御
- CSRF: Server Actions による自動対策（Next.js組み込み）
- SQLインジェクション: Prisma のパラメータ化クエリにより防止
- 環境変数: `.env*` は `.gitignore` に登録、機密情報はサーバーサイドのみで利用
- アクセスゲート: `ACCESS_KEY` による簡易アクセス制限（オプション）

### 可用性・デプロイ
- Vercel でホスティング（`output: "standalone"`）
- PostgreSQL: Supabase 等のマネージドDBを利用
- 障害発生時の自動復旧: Vercelのデフォルト機能に依存

### データバックアップ
- DBバックアップ: Supabase（またはホスティング先）のバックアップ機能に依存
- Google Sheets: 元データはスプレッドシートに保持されるため、本システム障害時もデータ消失なし
