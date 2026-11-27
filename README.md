# たかぼうのポートフォリオサイト

GitHub Pages 向けの静的ポートフォリオサイトです。`data/` の JSON ファイルから `index.html`、作品詳細ページ（`works/<id>.html`）、`404.html`、`robots.txt` を生成します（`data/site.json` の `searchIndex` が `true` のときだけ `sitemap.xml` も生成。いまは `false`＝全ページに noindex を入れ、検索には載せない設定）。

外部パッケージへの依存はなく、Node.js（標準機能のみ）で動作します。

## ファイル構成

- `data/site.json`：プロフィール・自己紹介・連絡先・ピン留め・「できること」のバナー・検索に載せるか（`searchIndex`）の設定
- `data/works.json`：カテゴリと作品一覧
- `assets/css/style.css`：スタイルシート
- `assets/js/main.js`：カテゴリタブ、自己紹介の開閉、メールアドレス組み立て、下部バー制御
- `assets/img/`・`assets/pinned/`・`assets/works/`：画像ファイル
- `tools/build.js`：HTML 等の生成スクリプト
- `tools/check.js`：データ・リンク・表示文言・セキュリティ等の点検スクリプト
- `tools/serve.js`：ローカル確認用サーバー（`127.0.0.1:5190`）

## 作品の足し方

1. 作品の画像を `assets/works/<新しいid>/` に配置します（カード用 `card.jpg` とギャラリー用画像）。
2. `data/works.json` の `works` 配列に新しい作品のデータを1件追加します（必須項目：`id`、`title`、`category`、`card`、`cardAlt`、`description` 3行、`role`、`tools`、`period`、`links`、`gallery`）。
3. 次のコマンドでページを生成します。

```bash
npm run build
```

（PowerShell で `npm` の実行ポリシーエラーが出る場合は、`npm.cmd run build` または `node tools/build.js` を実行してください。）

## 確認のしかた

1. 自動点検を実行してエラーが出ないことを確認します。

```bash
npm run check
```

2. ローカル確認用サーバーを起動し、ブラウザで `http://127.0.0.1:5190/` を開いて見た目やリンクを確認します。

```bash
npm run serve
```

## 公開のしかた（GitHub Pages）

1. 生成済みの `index.html`、`works/*.html`、`404.html`、`robots.txt` を含めて、`main` ブランチにコミットし、GitHub の `takabou-n.github.io` リポジトリへ push します。
2. GitHub リポジトリの **Settings > Pages** を開きます。
3. **Build and deployment** の Source で **Deploy from a branch** を選び、Branch を **`main`**、フォルダを **`/ (root)`** に設定して保存します。
4. 公開後、`https://takabou-n.github.io/` で表示を確認します。

- 2026-11-27：さわって動くLP（AI画像スクールのデモ）を追加。2つのLPは demo/ にコピーして置いている（demo/interactive-lp＝元 D:/Claude_Code/interactive-lp-v3、demo/school-lp＝元 イノベ大/AIコピー部【3期】/卒業課題/lp）。元を直したら demo/ に上書きコピーし、index.html の <meta name="robots" content="noindex, nofollow"> を入れ直す。
