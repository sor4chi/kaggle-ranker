# Kaggle Ranker Bot

Kaggleの開催中コンペティションのリーダーボードから指定ユーザーのランキングを検索し、Slack/Discordに定期投稿するCloudflare Workers Bot。

## クイックスタート

```bash
pnpm install
cp .dev.vars.example .dev.vars  # 編集して各種トークンを設定
pnpm run dev                    # ローカル起動
```

別ターミナルで動作確認：

```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

## セットアップガイド

構成に応じた詳細な手順は `docs/` を参照してください。

| 構成 | ガイド |
|------|--------|
| Discord + 環境変数でユーザー管理 | [docs/setup-discord-env.md](docs/setup-discord-env.md) |
| Slack + Google Spreadsheetでユーザー管理 | [docs/setup-slack-spreadsheet.md](docs/setup-slack-spreadsheet.md) |

## 環境変数

### Secrets（`wrangler secret put` で設定）

| 変数名 | 説明 |
|--------|------|
| `KAGGLE_API_TOKEN` | Kaggle APIトークン（必須） |
| `SLACK_WEBHOOK_URL` | Slack Webhook URL |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google サービスアカウントJSON鍵（spreadsheetプロバイダー使用時） |

通知先のWebhook URLは少なくとも1つ必須。

### Config（`wrangler.jsonc` の `vars` で設定）

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `CONFIG_PROVIDER` | `env` | ユーザーID取得元（`env` / `spreadsheet`） |
| `TARGET_USER_IDS` | ― | カンマ区切りのKaggleユーザーID（envプロバイダー時） |
| `SPREADSHEET_ID` | ― | Google SpreadsheetのID（spreadsheetプロバイダー時） |
| `SHEET_NAME` | `Sheet1` | シート名 |

## デプロイ

```bash
pnpm run deploy
```

## アーキテクチャ

```text
src/
├── index.ts           # CFWエントリポイント
├── app.ts             # コンポジションルート（DI組み立て）
├── logger.ts          # Logger interface + CompositeLogger
├── format.ts          # 共通フォーマット関数
├── kaggle/            # Kaggle API・ランキング検索・CSV解析
├── config/            # ConfigProvider（env / spreadsheet）
└── notifier/          # Notificator + Slack/Discord実装
```

- **Secret / Config 分離** — 認証情報はCFW Secrets、運用データはConfigProviderで取得元を切り替え
- **DI** — `app.ts` がコンポジションルート。全依存をコンストラクタ注入、グローバルシングルトンなし
- **Notificator** — 複数Notifierの集約。部分失敗許容 / best-effort を内部管理

## ライセンス

MIT
