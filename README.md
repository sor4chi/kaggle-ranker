# Kaggle Ranker Bot

Cloudflare WorkersのCron Triggerを使用して、Kaggleの開催中コンペティションのリーダーボードから指定したユーザーを検索し、ランキング情報をSlackやDiscordに定期投稿するBotです。

## 機能

- 現在開催中の全てのKaggleコンペティション（常設コンペを除く）を自動取得
- 指定したユーザーID（複数可）のリーダーボードでの順位を検索
- 見やすいフォーマットでSlack・Discord（両方同時も可能）に自動投稿
- Cloudflare Workersで動作するため、サーバーレスで低コスト

## 必要な準備

### 1. Kaggle API認証情報の取得

1. [Kaggle](https://www.kaggle.com)にログイン
2. アカウント設定（<https://www.kaggle.com/settings/account）へ移動>
3. "Create New API Token"ボタンをクリック
4. `kaggle.json`ファイルがダウンロードされます
5. ファイル内の`username`と`key`を控えておく

### 2. 通知先の設定（いずれか必須、両方も可能）

#### Slack Webhook URLの取得

1. [Slack API](https://api.slack.com/messaging/webhooks)へアクセス
2. "Create your Slack app"から新しいアプリを作成
3. "Incoming Webhooks"を有効化
4. 投稿先のチャンネルを選択してWebhook URLを取得

#### Discord Webhook URLの取得

1. Discordサーバーの「サーバー設定」を開く
2. 「連携サービス」→「ウェブフック」を選択
3. 「新しいウェブフック」をクリック
4. ウェブフックの名前とチャンネルを設定
5. 「ウェブフックURLをコピー」をクリック

### 3. Cloudflareアカウント

- [Cloudflare Workers](https://workers.cloudflare.com/)のアカウントが必要です
- 無料プランで利用可能です

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.dev.vars.example`をコピーして`.dev.vars`を作成し、実際の値を設定します：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`を編集：

```bash
# 必須
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_api_key
TARGET_USER_IDS=user1,user2,user3

# 通知先（いずれか必須、両方設定すると両方に送信されます）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL

# オプション: 特定の通知先のみを使用する場合
# NOTIFIER_TYPE=slack  # または discord
```

**環境変数の説明：**

**必須項目：**

- `KAGGLE_USERNAME`, `KAGGLE_KEY`: Kaggle APIの認証情報
- `TARGET_USER_IDS`: 追跡したいKaggleのユーザーID（ユーザー名）をカンマ区切りで指定

**通知設定（少なくとも1つ必須）：**

- `SLACK_WEBHOOK_URL`: Slack Webhook URL（オプション）
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL（オプション）
- `NOTIFIER_TYPE`: 通知先を1つに制限する場合に指定（オプション）

**コンペティションフィルタリング（すべてオプション）：**

- `COMPETITION_CATEGORIES`: 追跡するカテゴリをカンマ区切りで指定（例: `Featured,Research,Recruitment`）
  - 未設定の場合、常設コンペを除く全カテゴリが対象
- `EXCLUDE_KNOWLEDGE_ONLY`: `false`に設定すると、Knowledgeのみの報酬のコンペも含める（デフォルト: `true`）
- `MAX_DEADLINE_YEARS`: 締切が何年先までのコンペを対象にするか（デフォルト: `2`）

**注意：**

- `SLACK_WEBHOOK_URL`と`DISCORD_WEBHOOK_URL`の少なくとも1つは設定する必要があります
- 両方設定すると、両方のサービスに同時に通知が送られます
- フィルタリング設定により、常設コンペ（Getting Started、Playground等）は自動的に除外されます

### 3. ローカル開発とテスト

開発サーバーを起動：

```bash
pnpm run dev
```

別のターミナルでスケジューラーをテスト：

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

### 4. 本番環境へのデプロイ

#### 環境変数の設定（本番環境）

```bash
# 必須
wrangler secret put KAGGLE_USERNAME
wrangler secret put KAGGLE_KEY
wrangler secret put TARGET_USER_IDS

# 通知先（少なくとも1つは設定してください）
wrangler secret put SLACK_WEBHOOK_URL      # Slackを使用する場合
wrangler secret put DISCORD_WEBHOOK_URL    # Discordを使用する場合

# オプション
wrangler secret put NOTIFIER_TYPE          # 特定の通知先のみを使用する場合
```

各コマンド実行後、値を入力してEnterキーを押します。

#### デプロイ

```bash
pnpm run deploy
```

## Cron Triggerの設定

`wrangler.jsonc`の`triggers.crons`で実行スケジュールを変更できます：

```jsonc
"triggers": {
  "crons": [
    "0 3 * * *"  // 毎日3:00 AM UTC
  ]
}
```

### Cron式の例

- `"0 3 * * *"` - 毎日3:00 AM
- `"0 */6 * * *"` - 6時間ごと
- `"0 3,12 * * *"` - 毎日3:00 AMと12:00 PM
- `"0 3 * * 1"` - 毎週月曜日の3:00 AM

## プロジェクト構成

```
kaggle-ranker/
├── src/
│   ├── index.ts             # メインWorkerエントリーポイント
│   ├── types.ts             # TypeScript型定義
│   ├── kaggle-client.ts     # Kaggle API クライアント
│   ├── ranker.ts            # ランキング検索ロジック
│   ├── notifier.ts          # 通知サービスの基底インターフェース
│   ├── slack-notifier.ts    # Slack通知クライアント
│   ├── discord-notifier.ts  # Discord通知クライアント
│   └── notifier-factory.ts  # 通知サービスのファクトリー
├── wrangler.jsonc           # Cloudflare Workers設定
├── package.json
└── README.md
```

## 動作の仕組み

1. **スケジュール実行**: Cron Triggerが指定された時刻にWorkerを起動
2. **コンペティション取得**: Kaggle APIから開催中のコンペティション一覧を取得
3. **リーダーボード検索**: 各コンペのリーダーボードをダウンロード
4. **ユーザー検出**: 指定されたユーザーIDがリーダーボードに存在するか検索
5. **通知送信**: 見つかったランキング情報をSlack/Discordに整形して投稿

## トラブルシューティング

### Kaggle APIのレート制限

大量のコンペティションがある場合、APIレート制限に達する可能性があります。`ranker.ts`の`sleep`時間を調整してください。

### 認証エラー

Kaggle APIの認証情報が正しいか確認してください。`kaggle.json`の`username`と`key`を使用します。

### 通知が届かない

**Slackの場合：**

- Webhook URLが正しいか確認
- Slackアプリの権限設定を確認
- チャンネルにアプリが追加されているか確認

**Discordの場合：**

- Webhook URLが正しいか確認
- Webhookが削除されていないか確認
- チャンネルの権限設定を確認

**共通：**

- Cloudflare Workersのログを確認: `wrangler tail`
- 環境変数が正しく設定されているか確認

## ログの確認

本番環境のログをリアルタイムで確認：

```bash
wrangler tail
```

## ライセンス

MIT
