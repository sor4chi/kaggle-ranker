# セットアップガイド: Discord通知 + 環境変数でユーザー管理

Discordに通知を送信し、追跡対象のKaggleユーザーIDを環境変数で管理する構成のセットアップ手順です。

最もシンプルな構成で、外部サービス連携はDiscordのみです。

## 構成概要

```text
環境変数 TARGET_USER_IDS (ユーザーIDリスト)
        ↓ 読み取り
  Kaggle Ranker Bot (Cloudflare Workers)
        ↓ 通知
  Discord チャンネル
```

## 1. Discord Webhook URLの取得

1. Discordで通知を送りたいサーバーを開く
2. 「サーバー設定」→「連携サービス」→「ウェブフック」を選択
3. 「新しいウェブフック」をクリック
4. 名前（例: `Kaggle Ranker`）と投稿先チャンネルを設定
5. 「ウェブフックURLをコピー」をクリック（`https://discord.com/api/webhooks/...`）

## 2. Kaggle APIトークンの取得

1. [Kaggle](https://www.kaggle.com) にログイン
2. [設定ページ](https://www.kaggle.com/settings)へ移動
3. APIセクションの「Generate New Token」をクリック
4. 表示されたAPIトークンをコピー

## 3. ローカル環境のセットアップ

### 3-1. `.dev.vars` の作成

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を以下のように編集：

```bash
# Secrets
KAGGLE_API_TOKEN=your_kaggle_api_token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL

# Config
CONFIG_PROVIDER=env
TARGET_USER_IDS=kaggle_user_1,kaggle_user_2,kaggle_user_3
```

### 3-2. 動作確認

```bash
pnpm run dev
```

別ターミナルで：

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

Discordチャンネルにランキング情報が投稿されれば成功です。

## 4. 本番環境へのデプロイ

### 4-1. Secretsの設定

```bash
wrangler secret put KAGGLE_API_TOKEN
# → Kaggle APIトークンを入力

wrangler secret put DISCORD_WEBHOOK_URL
# → Discord Webhook URLを入力
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
    "CONFIG_PROVIDER": "env",
    "TARGET_USER_IDS": "kaggle_user_1,kaggle_user_2,kaggle_user_3",
  }
}
```

### 4-3. デプロイ

```bash
pnpm run deploy
```

## 5. ユーザーの追加・削除

`wrangler.jsonc` の `TARGET_USER_IDS` を編集して再デプロイします：

```bash
pnpm run deploy
```

または、`wrangler secret put TARGET_USER_IDS` でSecretとして上書きすることもできます（Secretは `vars` より優先されます）。
