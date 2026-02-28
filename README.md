# 🎯 omikuji-gum-talk-next

ライトニングトーク（LT）会用のお題箱 Web アプリケーションです。  
参加者がトークテーマを投稿し、LT 当日にランダムで抽選することで、スムーズな会進行を補助します。

## 主な機能

- **お題投稿** — 件名・本文・タイプ（SOLO / GROUP）・予想所要時間を設定して投稿
- **お題一覧** — 未消化 / 消化済みのフィルタリング表示、権限に応じた詳細閲覧
- **くじ引き（ガムトーク）** — 排他制御付きランダム抽選、タイプ別演出、非表示タイマー
- **ズレ係数** — 予想時間と実績時間の差を学習し、補正予測時間を表示
- **ユーザー管理** — ロールベース権限（Admin / General）、論理削除対応

## 技術スタック

| レイヤー       | 技術                              |
| :------------- | :-------------------------------- |
| Framework      | Next.js 15 (App Router, React 19) |
| Language       | TypeScript                        |
| Styling        | Tailwind CSS                      |
| Database       | PostgreSQL 16                     |
| ORM            | Prisma                            |
| Authentication | JWT (jose) + HttpOnly Cookie      |
| Infrastructure | Docker / Docker Compose           |

## 前提条件

- **Node.js** 20 以上
- **npm** (または互換パッケージマネージャ)
- **Docker** & **Docker Compose** (DB コンテナ用、または全コンテナ起動時)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd omikuji-gum-talk-next
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集し、特に `JWT_SECRET` を本番運用時は安全な値に変更してください。

| 変数名                 | 説明                           | デフォルト値                      |
| :--------------------- | :----------------------------- | :-------------------------------- |
| `DATABASE_URL`         | PostgreSQL 接続文字列          | (docker-compose 用のデフォルト値) |
| `JWT_SECRET`           | JWT 署名用シークレットキー     | `your-super-secret-...`（要変更） |
| `NEXT_PUBLIC_APP_NAME` | アプリ表示名                   | `おだいボックス`                  |
| `ALPHA_LEARNING_RATE`  | ズレ係数の学習率 α             | `0.2`                             |
| `MIN_ACTUAL_DURATION`  | 実績時間の最小クリップ値（分） | `0.1`                             |

## 起動方法

### 方法 A: ローカル開発（DB のみ Docker）

```bash
# 1. 依存関係インストール
npm install

# 2. PostgreSQL コンテナを起動
docker compose up -d db

# 3. ローカル用の DATABASE_URL に変更（.env）
#    DATABASE_URL="postgresql://omikuji:omikuji_password@localhost:5432/omikuji_db?schema=public"

# 4. Prisma マイグレーション実行
npx prisma migrate dev --name init

# 5. 初期データ投入（admin ユーザー・ロール・権限）
npx prisma db seed

# 6. 開発サーバー起動
npm run dev
```

アプリケーションが http://localhost:3000 で起動します。

### 方法 B: Docker Compose で全コンテナ起動

```bash
docker compose up --build
```

app コンテナ起動時に `prisma migrate deploy` が自動実行されます。  
初回起動後、シード投入が必要な場合は以下を実行してください:

```bash
docker compose exec app npx prisma db seed
```

## デフォルトアカウント

シード実行後、以下の管理者アカウントが作成されます。

| ユーザー名 | パスワード | ロール |
| :--------- | :--------- | :----- |
| `admin`    | `admin`    | Admin  |

> ⚠️ 本番環境ではパスワードを必ず変更してください。

## npm スクリプト

| コマンド              | 説明                        |
| :-------------------- | :-------------------------- |
| `npm run dev`         | 開発サーバー起動            |
| `npm run build`       | プロダクションビルド        |
| `npm run start`       | プロダクションサーバー起動  |
| `npm run lint`        | ESLint 実行                 |
| `npm run db:generate` | Prisma Client 生成          |
| `npm run db:push`     | スキーマをDBに直接反映      |
| `npm run db:migrate`  | マイグレーション作成・実行  |
| `npm run db:seed`     | 初期データ投入              |
| `npm run db:studio`   | Prisma Studio（DB GUI）起動 |

## ディレクトリ構成

```
src/
├── app/                  # App Router ページ / レイアウト
│   ├── (main)/           # メイン画面群（認証必須）
│   │   ├── page.tsx          # トップ画面
│   │   ├── themes/page.tsx   # お題一覧
│   │   ├── post/page.tsx     # お題投稿
│   │   ├── draw/page.tsx     # くじ引き
│   │   └── admin/page.tsx    # 管理画面
│   ├── login/page.tsx    # ログイン
│   ├── register/page.tsx # ユーザー登録
│   ├── api/me/route.ts   # 現在のユーザー情報 API
│   ├── layout.tsx        # ルートレイアウト
│   └── globals.css       # グローバルスタイル
├── actions/              # Server Actions
│   ├── auth.ts               # 認証（login, logout, register）
│   ├── themes.ts             # お題操作（投稿, 削除, 抽選, 完了）
│   └── users.ts              # ユーザー管理（権限変更, 削除）
├── components/features/  # 機能コンポーネント
│   ├── Header.tsx
│   ├── ThemeList.tsx
│   ├── DrawMachine.tsx
│   └── AdminPanel.tsx
├── lib/                  # ユーティリティ
│   ├── prisma.ts             # Prisma Client
│   └── auth.ts               # 認証ヘルパー
├── types/index.ts        # 型定義
└── middleware.ts         # 認証ミドルウェア
prisma/
├── schema.prisma         # データベーススキーマ
└── seed.ts               # 初期データ
```

## 権限モデル

| 権限スラッグ          | 説明                     | Admin | General |
| :-------------------- | :----------------------- | :---: | :-----: |
| `draw_omikuji`        | くじ引き実行             |  ✅   |   ❌    |
| `view_others_posts`   | 他ユーザーの投稿詳細閲覧 |  ✅   |   ❌    |
| `delete_others_posts` | 他ユーザーの投稿削除     |  ✅   |   ❌    |

## ライセンス

[LICENSE](LICENSE) を参照してください。
