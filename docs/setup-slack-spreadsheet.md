# セットアップガイド: Slack通知 + Google Spreadsheetでユーザー管理

Slack に通知を送信し、追跡対象のKaggleユーザーIDをGoogle Spreadsheetで管理する構成のセットアップ手順です。

## 構成概要

```
Google Spreadsheet (ユーザーIDリスト)
        ↓ 読み取り
  Kaggle Ranker Bot (Cloudflare Workers)
        ↓ 通知
  Slack チャンネル
```

## 1. Slack Webhook URLの取得

1. <https://api.slack.com/apps> にアクセスし「Create New App」→「From scratch」を選択
2. App Name（例: `Kaggle Ranker`）と投稿先のワークスペースを選択して作成
3. 左メニューの「Incoming Webhooks」をクリック → トグルを **On** に変更
4. ページ下部の「Add New Webhook to Workspace」をクリック
5. 投稿先チャンネルを選択して「Allow」
6. 生成された Webhook URL（`https://hooks.slack.com/services/T.../B.../xxx`）をコピー

## 2. Google Spreadsheetの準備

### 2-1. スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com) で新しいスプレッドシートを作成
2. 以下のようにA列にユーザーIDを記入（1行目はヘッダー、2行目以降がデータ）

| A |
|---|
| user_id |
| kaggle_user_1 |
| kaggle_user_2 |
| kaggle_user_3 |

3. URLからスプレッドシートIDをメモ

```
https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
                                        ^^^^^^^^^^^^^^^^
                                        この部分がID
```

### 2-2. Google Cloud サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（または既存を使用）
2. 「APIとサービス」→「ライブラリ」から **Google Sheets API** を検索して有効化
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」を選択
4. 名前を入力（例: `kaggle-ranker`）して作成
5. 作成したサービスアカウントの詳細画面 →「鍵」タブ →「鍵を追加」→「新しい鍵を作成」→ **JSON** を選択
6. ダウンロードされたJSONファイルを安全に保管

### 2-3. スプレッドシートの共有

1. ダウンロードしたJSONの `client_email` フィールドの値をコピー（例: `kaggle-ranker@project-id.iam.gserviceaccount.com`）
2. Google Spreadsheetを開き、右上の「共有」ボタンをクリック
3. コピーしたメールアドレスを入力し、権限を **閲覧者** に設定して共有

## 3. ローカル環境のセットアップ

### 3-1. `.dev.vars` の作成

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を以下のように編集：

```bash
# Secrets
KAGGLE_API_TOKEN=your_kaggle_api_token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# サービスアカウントのJSONを1行にして貼り付け
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}

# Config
CONFIG_PROVIDER=spreadsheet
SPREADSHEET_ID=your_spreadsheet_id
```

> **Tips**: JSONを1行にするには `jq -c . < credentials.json` が便利です。

### 3-2. 動作確認

```bash
pnpm run dev
```

別ターミナルで：

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Slackチャンネルにランキング情報が投稿されれば成功です。

## 4. 本番環境へのデプロイ

### 4-1. Secretsの設定

```bash
wrangler secret put KAGGLE_API_TOKEN
# → Kaggle APIトークンを入力

wrangler secret put SLACK_WEBHOOK_URL
# → Slack Webhook URLを入力

wrangler secret put GOOGLE_SERVICE_ACCOUNT_KEY
# → サービスアカウントJSONを1行にして入力
```

### 4-2. Configの設定

`wrangler.jsonc` に `vars` を追加：

```jsonc
{
  "name": "kaggle-ranker",
  "main": "src/index.ts",
  "compatibility_date": "2025-10-24",
  "observability": { "enabled": true },
  "triggers": { "crons": ["0 3 * * *"] },
  "vars": {
    "CONFIG_PROVIDER": "spreadsheet",
    "SPREADSHEET_ID": "your_spreadsheet_id"
  }
}
```

### 4-3. デプロイ

```bash
pnpm run deploy
```

## 5. ユーザーの追加・削除

スプレッドシートのA列を編集するだけです。次回のCron実行時から反映されます。

コードの変更やデプロイは不要です。
