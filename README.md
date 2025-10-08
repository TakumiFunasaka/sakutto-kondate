# サクッと献立

サクッと一食分の献立を考えてくれるアプリです。家にある食材を入力するだけで、1時間以内で作れる美味しい献立を提案します。

## 機能

- 🍳 **食材ベースの献立提案**: 家にある食材を入力するだけで献立を提案
- 👨‍👩‍👧‍👦 **家族構成対応**: 人数や年齢に合わせて分量を調整
- ⏰ **1時間以内**: 手軽に作れる料理を厳選
- 📝 **詳細レシピ**: 作り方の手順とコツまで詳しく説明
- 🔐 **簡単認証**: 最低限のログイン機構

## 技術スタック

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel
- **Icons**: Lucide React

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# App Password (for authentication)
NEXT_PUBLIC_APP_PASSWORD=recipe2024
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

## デプロイ

### Vercel へのデプロイ

1. [Vercel](https://vercel.com) にアカウントを作成
2. GitHub リポジトリを接続
3. 環境変数を設定：
   - `OPENAI_API_KEY`: OpenAI API キー
   - `NEXT_PUBLIC_APP_PASSWORD`: アプリのパスワード
4. デプロイ実行

### 環境変数の設定

Vercel のダッシュボードで以下の環境変数を設定してください：

- `OPENAI_API_KEY`: OpenAI API キー
- `NEXT_PUBLIC_APP_PASSWORD`: アプリのパスワード（デフォルト: recipe2024）

## 使用方法

1. アプリにアクセス
2. パスワードを入力してログイン
3. 「献立を提案してもらう」をクリック
4. 家にある食材を入力
5. 家族構成（人数・年齢）を入力
6. 「献立を提案してもらう」をクリック
7. 提案されたレシピを確認

## ライセンス

MIT License