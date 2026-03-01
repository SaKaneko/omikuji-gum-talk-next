# Prisma ガイド（Omikuji Gum Talk Next）

このドキュメントは、チーム内でPrismaに馴染みがない方向けに、Prismaの基本的な概念と、本プロジェクトにおける役割を説明するものです。

## 1. Prismaとは？

[Prisma](https://www.prisma.io/) は、Node.jsおよびTypeScript向けの強力な **次世代ORM (Object-Relational Mapper)** です。
データベースのテーブルとそのリレーションを直感的に定義し、型安全な方法でデータベースに対してCRUD（作成、読み取り、更新、削除）操作を行うことができます。

### Prismaの主な特徴

1. **型安全性**: データベースのスキーマ定義を基にTypeScriptの型を自動生成するため、開発中にエディタ（VS Codeなど）で強力なコード補完の恩恵を受けられます。また、タイポや型違いによるバグを未然に防ぐことができます。
2. **直感的なクエリ操作**: `prisma.user.findMany()` のように、分かりやすくメソッドチェーンを使ってデータベースを操作できます。複雑なSQLを直接書く必要がほとんどありません。
3. **スキーマ駆動**: `schema.prisma` という一つのファイルでデータモデル（テーブル構造）を定義します。これがデータベースの設計図として機能します。

---

## 2. Prismaの3つの主要コンポーネント

Prismaは主に以下の3つのツールから構成されています。

### 1. Prisma Schema (`schema.prisma`)

データベース接続情報や、データモデル（テーブル、カラム、データ型、リレーション）を定義するファイルです。

### 2. Prisma Migrate

`schema.prisma` の変更を実際にデータベースへ適用するためのシステムです。
変更履歴（マイグレーションファイル）を管理することで、チーム開発時でも安全にデータベース構造を進化させていくことができます。

### 3. Prisma Client

`schema.prisma` から自動的に生成されるデータベースクライアント（ライブラリ）です。
アプリケーションのコード（TypeScript）からデータベースにアクセスする際は、これを使用します。

---

## 3. 本プロジェクトにおける Prisma の役割・構成

本プロジェクト (`Omikuji Gum Talk Next`) では、PostgreSQLデータベースとの橋渡し役としてPrismaを全面採用しています。

### ディレクトリ構成

- **`prisma/schema.prisma`**
  プロジェクトのすべてのテーブル構造が記述されています。
  （例: `User`（ユーザー）、`Role`（権限ロール）、`Theme`（おみくじやトークのテーマ）など）
- **`prisma/migrations/`**
  過去に行われたデータベースの変更履歴（SQLファイル構成）が保存されています。
- **`prisma/seed.ts`**
  開発環境などで初期データ（テストユーザーや初期テーマなど）をデータベースに流し込むためのスクリプトです。
- **`src/lib/prisma.ts`**
  アプリケーション全体で `PrismaClient` を安全に使い回すためのファイルです。Next.js特有のホットリロード時などにデータベースコネクションが枯渇しないようにする工夫（シングルトン化）がなされています。

### アプリケーションコードでの使われ方

サーバー側（Next.jsの Server Actions(`src/actions/`) や APIルート(`src/app/api/`)）からデータベースへアクセスする際、以下のように使われています。

```typescript
import { prisma } from "@/lib/prisma";

// 例: 未使用のテーマを取得する
const themes = await prisma.theme.findMany({
  where: {
    isUsed: false,
  },
  include: {
    author: true, // リレーションをたどって作成者情報も取得
  },
});
```

---

## 4. 開発でよく使う Prisma コマンド

開発中にデータベース周りの操作を行う際、以下のコマンドをターミナルで実行します。

### `npx prisma generate`

`schema.prisma` の内容を元にPrisma Client（TypeScriptの型定義とアクセス機能）を再生成します。
**※ `schema.prisma` を直接書き換えた後に必ず実行してください。**

### `npx prisma migrate dev --name <マイグレーション名>`

`schema.prisma` の変更を元に差分となるSQLファイルを自動生成し、ローカルのデータベースに適用（反映）します。
（例: `npx prisma migrate dev --name add_new_column`）

### `npx prisma studio`

ブラウザ上で起動する、公式のデータベース閲覧・編集GUIツールです。
データベースの中身を簡単に確認・編集（テストデータの追加など）したい時に非常に便利です。
ポート `5555` で立ち上がります。

### `npx prisma db seed`

`prisma/seed.ts` に定義された初期データ投入処理を実行します。
開発環境を新しく構築した際や、データベースをリセットした後に使用します。

---

## 5. エラーが出たときのトラブルシューティング

- **「PrismaClient is not defined」や「型が見つからない」というエラーが出る**
  👉 大抵の場合、型の自動生成が行われていません。 `npx prisma generate` を実行してエディタを再起動などを試してください。
- **データベースに変更（新しいカラムなど）を加えたがコードから見えない・エラーになる**
  👉 データベースに変更が適用されていません。「`schema.prisma` の編集」→「`npx prisma migrate dev` でDBへ反映」→「`npx prisma generate` で型再生成」の流れが行われているか確認してください。
