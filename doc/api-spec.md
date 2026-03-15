# お題箱アプリケーション API仕様書

## 概要

本ドキュメントは、お題箱アプリケーション（omikuji-gum-talk）が提供するREST APIのエンドポイント仕様をまとめたものです。  
外部システム（OBS、ダッシュボード、CI/CDなど）との連携や、プログラムからのデータ取得に利用できます。

---

## 認証方式

各APIエンドポイントは以下のいずれか（または両方）の認証方式に対応しています。

### 1. Cookie認証（JWT）

ブラウザからのリクエスト用。ログイン時に発行される HttpOnly Cookie（`auth-token`）を使用します。  
有効期限は24時間です。

### 2. APIキー認証

外部システム連携用。管理者が発行したAPIキーを以下のいずれかのヘッダーで送信します。

| ヘッダー        | 形式                     |
| --------------- | ------------------------ |
| `Authorization` | `Bearer ogt_xxxxxxxx...` |
| `X-API-Key`     | `ogt_xxxxxxxx...`        |

- APIキーは `ogt_` プレフィックス + 64文字の16進数で構成されます。
- APIキーが指定されている場合、Cookie認証より**APIキー認証が優先**されます。
- APIキーで認証されたリクエストは、キーを発行したadminユーザーの権限で処理されます。
- 無効化（revoke）されたAPIキーでのリクエストは拒否されます。

---

## 共通仕様

### ベースURL

```
{SCHEME}://{HOST}:{PORT}{BASE_PATH}
```

- `BASE_PATH` は環境変数で設定可能（例: `/app`）。未設定の場合はルート（`/`）。

### レスポンス形式

すべてのレスポンスは `application/json` 形式です。

### 共通エラーレスポンス

| HTTPステータス     | 意味                         | レスポンス例                  |
| ------------------ | ---------------------------- | ----------------------------- |
| `401 Unauthorized` | 認証が必要、または認証に失敗 | `{ "error": "Unauthorized" }` |
| `403 Forbidden`    | 認証済みだが権限不足         | `{ "error": "Forbidden" }`    |

---

## エンドポイント一覧

| メソッド | パス                    | 認証     | 権限  | 概要                              |
| -------- | ----------------------- | -------- | ----- | --------------------------------- |
| `GET`    | `/api/me`               | 必要     | なし  | ログインユーザー情報の取得        |
| `GET`    | `/api/themes/remaining` | **不要** | なし  | 未消化お題の集計情報取得          |
| `GET`    | `/api/themes/active`    | 必要     | なし  | 発表中（IN_PROGRESS）のお題を取得 |
| `GET`    | `/api/users`            | 必要     | admin | 全有効ユーザー一覧の取得          |
| `GET`    | `/api/users/admin`      | 必要     | admin | 管理者ユーザー一覧の取得          |

---

## エンドポイント詳細

### `GET /api/me`

ログイン中のユーザー自身の情報を取得します。

#### 認証

必要（Cookie認証 または APIキー認証）

#### リクエスト

パラメータなし。

#### レスポンス

**`200 OK`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "yamada",
  "displayName": "山田太郎",
  "roleName": "admin",
  "permissions": ["draw_omikuji", "view_others_posts", "delete_others_posts"]
}
```

| フィールド    | 型         | 説明                            |
| ------------- | ---------- | ------------------------------- |
| `id`          | `string`   | ユーザーID（UUID）              |
| `name`        | `string`   | ログインID                      |
| `displayName` | `string`   | 表示名                          |
| `roleName`    | `string`   | ロール名（`admin` / `general`） |
| `permissions` | `string[]` | 付与された権限スラッグの配列    |

**権限スラッグ一覧:**

| スラッグ              | 説明                                   |
| --------------------- | -------------------------------------- |
| `draw_omikuji`        | おみくじ（くじ引き）を引く権限         |
| `view_others_posts`   | 他人の投稿の詳細（本文）を閲覧する権限 |
| `delete_others_posts` | 他人の投稿を削除する権限               |

**`401 Unauthorized`** — 認証なし、またはトークン/APIキーが無効

---

### `GET /api/themes/remaining`

未消化（PENDING）のお題の件数と所要時間集計を取得します。  
OBSや外部ダッシュボード等で進行状況や残り時間を表示するためのエンドポイントです。

#### 認証

**不要**（パブリックアクセス可能）

#### リクエスト

パラメータなし。

#### レスポンス

**`200 OK`**

```json
{
  "count": 5,
  "totalExpectedDuration": 35,
  "totalCorrectedDuration": 42.57
}
```

| フィールド               | 型       | 説明                                                              |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `count`                  | `number` | 未消化のお題の件数                                                |
| `totalExpectedDuration`  | `number` | 投稿者が入力した予想所要時間の合計（分）                          |
| `totalCorrectedDuration` | `number` | 各投稿者のズレ係数を適用した補正時間の合計（分）。小数第2位で丸め |

**補正時間の計算式:**

各お題の補正時間 = $T_{predicted} \times e^k$

- $T_{predicted}$: 投稿者が設定した予想所要時間（分）
- $k$: 投稿者のズレ係数（`timeBiasCoefficient`）

> **Note:** このエンドポイントは呼び出し時に発表中タイムアウトチェック（IN_PROGRESS状態が60分超のお題を自動COMPLETEDに変更）を実行します。

---

### `GET /api/themes/active`

現在発表中（`IN_PROGRESS` ステータス）のお題を取得します。  
発表中のお題がない場合は `null` を返します。

#### 認証

必要（Cookie認証 または APIキー認証）

#### リクエスト

パラメータなし。

#### レスポンス

**`200 OK`** — 発表中のお題がある場合

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "subject": "最近のTypeScript事情",
  "content": "## 話すこと\n\n- TypeScript 5.x の新機能\n- 型推論の改善点",
  "type": "LIGHTNING_TALK",
  "expectedDuration": 5,
  "author": {
    "displayName": "山田太郎",
    "deletedAt": null
  }
}
```

| フィールド           | 型               | 説明                                                         |
| -------------------- | ---------------- | ------------------------------------------------------------ |
| `id`                 | `string`         | お題ID（UUID）                                               |
| `subject`            | `string`         | お題の件名                                                   |
| `content`            | `string`         | お題の本文（Markdown形式）                                   |
| `type`               | `string`         | お題タイプ（後述）                                           |
| `expectedDuration`   | `number`         | 予想所要時間（分）                                           |
| `author.displayName` | `string`         | 投稿者の表示名                                               |
| `author.deletedAt`   | `string \| null` | 投稿者の削除日時（削除済みの場合はISO 8601形式の日時文字列） |

**`200 OK`** — 発表中のお題がない場合

```json
null
```

**`401 Unauthorized`** — 認証なし、またはトークン/APIキーが無効

> **Note:** このエンドポイントは呼び出し時に発表中タイムアウトチェックを実行します。IN_PROGRESS状態が60分を超えたお題は自動的にCOMPLETEDに変更され、`null` が返されます。

---

### `GET /api/users`

全有効ユーザーの表示名・メールアドレス一覧を取得します。

#### 認証

必要（Cookie認証 または APIキー認証）。**admin権限が必要**です。

#### リクエスト

パラメータなし。

#### レスポンス

**`200 OK`**

```json
[
  {
    "displayName": "山田太郎",
    "email": "yamada@example.com"
  },
  {
    "displayName": "佐藤花子",
    "email": null
  }
]
```

| フィールド    | 型               | 説明                                    |
| ------------- | ---------------- | --------------------------------------- |
| `displayName` | `string`         | ユーザーの表示名                        |
| `email`       | `string \| null` | メールアドレス（未設定の場合は `null`） |

- 論理削除済みユーザーは除外されます。
- ユーザー名（`name`）の昇順でソートされます。

**`401 Unauthorized`** — 認証なし  
**`403 Forbidden`** — 認証済みだがadmin権限なし

---

### `GET /api/users/admin`

adminロールを持つ有効ユーザーの表示名・メールアドレス一覧を取得します。

#### 認証

必要（Cookie認証 または APIキー認証）。**admin権限が必要**です。

#### リクエスト

パラメータなし。

#### レスポンス

**`200 OK`**

```json
[
  {
    "displayName": "山田太郎",
    "email": "yamada@example.com"
  }
]
```

| フィールド    | 型               | 説明                                    |
| ------------- | ---------------- | --------------------------------------- |
| `displayName` | `string`         | ユーザーの表示名                        |
| `email`       | `string \| null` | メールアドレス（未設定の場合は `null`） |

- adminロールを持つ有効ユーザーのみが返却されます（論理削除済みは除外）。
- ユーザー名（`name`）の昇順でソートされます。

**`401 Unauthorized`** — 認証なし  
**`403 Forbidden`** — 認証済みだがadmin権限なし

---

## 定数・列挙型

### ThemeType（お題タイプ）

| 値               | 説明                                      |
| ---------------- | ----------------------------------------- |
| `LIGHTNING_TALK` | ライトニングトーク（1人が発表、上限10分） |
| `PRESENTATION`   | プレゼンテーション（しっかり発表）        |
| `GROUP_TALK`     | グループトーク（みんなで話す）            |

### ThemeStatus（お題ステータス）

| 値            | 説明               |
| ------------- | ------------------ |
| `PENDING`     | 未消化（抽選対象） |
| `IN_PROGRESS` | 発表中             |
| `COMPLETED`   | 消化済み           |

---

## 利用例

### curlによるAPIキー認証での未消化お題情報取得

```bash
curl -s https://example.com/api/themes/remaining
```

> `/api/themes/remaining` は認証不要のため、ヘッダーなしでアクセスできます。

### curlによるAPIキー認証でのユーザー一覧取得

```bash
# Authorization ヘッダー方式
curl -s -H "Authorization: Bearer ogt_abcdef1234567890..." \
  https://example.com/api/users

# X-API-Key ヘッダー方式
curl -s -H "X-API-Key: ogt_abcdef1234567890..." \
  https://example.com/api/users
```

### OBSでの残り時間表示（ブラウザソース例）

```javascript
async function updateRemaining() {
  const res = await fetch("/api/themes/remaining");
  const data = await res.json();
  document.getElementById("count").textContent = data.count;
  document.getElementById("duration").textContent =
    Math.round(data.totalCorrectedDuration) + "分";
}

setInterval(updateRemaining, 30000);
updateRemaining();
```
