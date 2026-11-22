'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

function unescapeHtml(str) {
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function getAttr(tagText, attrName) {
  const re = new RegExp(
    `\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  );
  const match = tagText.match(re);
  if (!match) return null;
  return unescapeHtml(match[1] ?? match[2] ?? match[3] ?? '');
}

function isExternalUrl(value) {
  return /^(https?:)?\/\//i.test(value.trim());
}

function getHostname(value) {
  const normalized = value.trim().startsWith('//')
    ? 'https:' + value.trim()
    : value.trim();
  return new URL(normalized).hostname.toLowerCase();
}

function main() {
  const failures = [];
  const results = [];

  function record(num, label, errors) {
    if (errors.length === 0) {
      results.push(`[PASS] ${num}. ${label}`);
    } else {
      results.push(`[FAIL] ${num}. ${label}`);
      for (const err of errors) {
        results.push(`       - ${err}`);
        failures.push(`${num}. ${label}: ${err}`);
      }
    }
  }

  // 1. data/*.json readable & valid schema
  let site = null;
  let worksData = null;
  const check1Errors = [];
  try {
    site = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf8')
    );
  } catch (err) {
    check1Errors.push(`data/site.json の読み込みに失敗: ${err.message}`);
  }
  try {
    worksData = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'works.json'), 'utf8')
    );
  } catch (err) {
    check1Errors.push(`data/works.json の読み込みに失敗: ${err.message}`);
  }

  if (site) {
    if (!site.contact || !site.contact.mail || !site.contact.mail.user || !site.contact.mail.domain) {
      check1Errors.push('site.json に contact.mail.user / domain がありません');
    }
    if (!site.siteUrl) {
      check1Errors.push('site.json に siteUrl がありません');
    }
  }

  if (worksData) {
    if (!Array.isArray(worksData.categories) || worksData.categories.length === 0) {
      check1Errors.push('works.json に categories 配列がありません');
    }
    if (!Array.isArray(worksData.works) || worksData.works.length === 0) {
      check1Errors.push('works.json に works 配列がありません');
    } else {
      const catNames = new Set(
        (worksData.categories || []).map((c) => c.name)
      );
      const requiredFields = [
        'id',
        'title',
        'category',
        'card',
        'cardAlt',
        'description',
        'role',
        'tools',
        'period',
        'links',
        'gallery',
      ];
      for (const w of worksData.works) {
        for (const field of requiredFields) {
          if (w[field] === undefined || w[field] === null) {
            check1Errors.push(`作品 ${w.id || '(idなし)'} に ${field} がありません`);
          }
        }
        if (typeof w.id !== 'string' || !w.id.trim()) {
          check1Errors.push('作品に有効な id がありません');
        }
        if (!Array.isArray(w.description) || w.description.length !== 3) {
          check1Errors.push(`作品 ${w.id} の description が3行ではありません`);
        }
        if (!Array.isArray(w.role) || w.role.length === 0) {
          check1Errors.push(`作品 ${w.id} の role が配列ではありません`);
        }
        if (!Array.isArray(w.tools) || w.tools.length === 0) {
          check1Errors.push(`作品 ${w.id} の tools が配列ではありません`);
        }
        if (!Array.isArray(w.links)) {
          check1Errors.push(`作品 ${w.id} の links が配列ではありません`);
        }
        if (!Array.isArray(w.gallery)) {
          check1Errors.push(`作品 ${w.id} の gallery が配列ではありません`);
        }
        if (!catNames.has(w.category)) {
          check1Errors.push(
            `作品 ${w.id} の category "${w.category}" が categories に含まれません`
          );
        }
      }
    }
  }
  record(1, 'data/*.json の形式と必須項目', check1Errors);

  // 2. All image files referenced by data/ exist
  const check2Errors = [];
  const referencedImages = [];
  if (site) {
    if (site.icon) referencedImages.push(['site.icon', site.icon]);
    if (site.ogImage) referencedImages.push(['site.ogImage', site.ogImage]);
    if (site.contact && site.contact.line && site.contact.line.qr) {
      referencedImages.push(['site.contact.line.qr', site.contact.line.qr]);
    }
    if (Array.isArray(site.pinned)) {
      site.pinned.forEach((p, idx) => {
        if (p.image) referencedImages.push([`site.pinned[${idx}].image`, p.image]);
      });
    }
  }
  if (worksData && Array.isArray(worksData.works)) {
    for (const w of worksData.works) {
      if (w.card) referencedImages.push([`${w.id}.card`, w.card]);
      if (Array.isArray(w.gallery)) {
        w.gallery.forEach((g, idx) => {
          if (g.src) referencedImages.push([`${w.id}.gallery[${idx}].src`, g.src]);
        });
      }
    }
  }
  for (const [label, relPath] of referencedImages) {
    const abs = path.resolve(ROOT_DIR, relPath);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      check2Errors.push(`画像が見つかりません (${label}): ${relPath}`);
    }
  }
  record(2, 'data/ が参照する画像ファイルの実在', check2Errors);

  // Collect generated HTML files
  const htmlFiles = [];
  const indexAbs = path.join(ROOT_DIR, 'index.html');
  const notFoundAbs = path.join(ROOT_DIR, '404.html');
  if (fs.existsSync(indexAbs)) htmlFiles.push(indexAbs);
  if (fs.existsSync(notFoundAbs)) htmlFiles.push(notFoundAbs);
  const worksOutDir = path.join(ROOT_DIR, 'works');
  if (fs.existsSync(worksOutDir)) {
    for (const name of fs.readdirSync(worksOutDir).sort()) {
      if (name.endsWith('.html')) {
        htmlFiles.push(path.join(worksOutDir, name));
      }
    }
  }

  // 3. works/<id>.html count and links from index.html
  const check3Errors = [];
  const indexHtml = fs.existsSync(indexAbs)
    ? fs.readFileSync(indexAbs, 'utf8')
    : '';
  if (!fs.existsSync(indexAbs)) {
    check3Errors.push('index.html が存在しません');
  }
  if (!fs.existsSync(notFoundAbs)) {
    check3Errors.push('404.html が存在しません');
  }
  if (worksData && Array.isArray(worksData.works)) {
    const expectedSet = new Set(worksData.works.map((w) => `${w.id}.html`));
    const actualFiles = fs.existsSync(worksOutDir)
      ? fs.readdirSync(worksOutDir).filter((n) => n.endsWith('.html'))
      : [];
    for (const w of worksData.works) {
      const workFile = path.join(worksOutDir, `${w.id}.html`);
      if (!fs.existsSync(workFile)) {
        check3Errors.push(`works/${w.id}.html が存在しません`);
      }
      if (!indexHtml.includes(`href="works/${w.id}.html"`)) {
        check3Errors.push(`index.html から works/${w.id}.html へのリンクがありません`);
      }
    }
    for (const file of actualFiles) {
      if (!expectedSet.has(file)) {
        check3Errors.push(`works.json に無い HTML が残っています: works/${file}`);
      }
    }
  }
  record(3, 'works/<id>.html の生成数と index.html からのリンク', check3Errors);

  // 4. Relative links & image paths in generated HTML exist
  const check4Errors = [];
  for (const absHtml of htmlFiles) {
    const relHtml = path.relative(ROOT_DIR, absHtml);
    const content = fs.readFileSync(absHtml, 'utf8');
    const htmlDir = path.dirname(absHtml);
    const attrRegex = /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      const rawVal = unescapeHtml(match[1] ?? match[2] ?? '').trim();
      if (
        !rawVal ||
        rawVal.startsWith('#') ||
        /^https?:\/\//i.test(rawVal) ||
        /^mailto:/i.test(rawVal) ||
        /^data:/i.test(rawVal)
      ) {
        continue;
      }
      const cleanRel = rawVal.split('#')[0].split('?')[0];
      if (!cleanRel) continue;
      const targetAbs = path.resolve(htmlDir, cleanRel);
      const insideRoot =
        targetAbs === ROOT_DIR || targetAbs.startsWith(ROOT_DIR + path.sep);
      if (!insideRoot) {
        check4Errors.push(`${relHtml}: プロジェクト外の相対パス ${rawVal}`);
        continue;
      }
      if (!fs.existsSync(targetAbs) || !fs.statSync(targetAbs).isFile()) {
        check4Errors.push(`${relHtml}: リンク先/画像が存在しません: ${rawVal}`);
      }
    }
  }
  record(4, '生成 HTML 内の相対リンク・画像パスの実在', check4Errors);

  // 5. Exact description lines (after unescape) in generated HTML
  const check5Errors = [];
  if (worksData && Array.isArray(worksData.works)) {
    for (const w of worksData.works) {
      const workAbs = path.join(worksOutDir, `${w.id}.html`);
      if (!fs.existsSync(workAbs)) {
        check5Errors.push(`works/${w.id}.html が無いため照合できません`);
        continue;
      }
      const rawHtml = fs.readFileSync(workAbs, 'utf8');
      const unescapedFull = unescapeHtml(rawHtml);
      const descMatch = rawHtml.match(
        /<section\b[^>]*class="work-description"[^>]*>([\s\S]*?)<\/section>/i
      );
      const unescapedBody = descMatch ? unescapeHtml(descMatch[1]) : '';
      w.description.forEach((line, idx) => {
        if (!unescapedFull.includes(line)) {
          check5Errors.push(
            `works/${w.id}.html に description[${idx}] が一字一致で含まれません`
          );
        }
        if (!unescapedBody.includes(line)) {
          check5Errors.push(
            `works/${w.id}.html の本文(.work-description) に description[${idx}] が一字一致で含まれません`
          );
        }
      });
    }
  }
  record(5, '生成 HTML に description 各行が一字違わず含まれる', check5Errors);

  // Collect static CSS and JS files too
  const cssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
  const jsPath = path.join(ROOT_DIR, 'assets', 'js', 'main.js');
  const webSourceFiles = [...htmlFiles];
  if (fs.existsSync(cssPath)) webSourceFiles.push(cssPath);
  else failures.push('assets/css/style.css が存在しません');
  if (fs.existsSync(jsPath)) webSourceFiles.push(jsPath);
  else failures.push('assets/js/main.js が存在しません');

  // 6. No local paths / localhost / 127.0.0.1 in HTML, CSS, JS
  const check6Errors = [];
  const forbiddenLocalPatterns = [
    { label: 'D:\\', regex: /d:\\/i },
    { label: 'file:///', regex: /file:\/\/\//i },
    { label: 'localhost', regex: /localhost/i },
    { label: '127.0.0.1', regex: /127\.0\.0\.1/ },
  ];
  for (const fileAbs of webSourceFiles) {
    const rel = path.relative(ROOT_DIR, fileAbs);
    const text = fs.readFileSync(fileAbs, 'utf8');
    for (const pat of forbiddenLocalPatterns) {
      if (pat.regex.test(text)) {
        check6Errors.push(`${rel} に禁止文字列 ${pat.label} が含まれています`);
      }
    }
  }
  record(6, 'HTML・CSS・JS にローカルパスや localhost 等を含まない', check6Errors);

  // 7. No joined email address in generated HTML
  const check7Errors = [];
  if (site && site.contact && site.contact.mail) {
    const fullEmail = `${site.contact.mail.user}@${site.contact.mail.domain}`;
    const emailLower = fullEmail.toLowerCase();
    for (const absHtml of htmlFiles) {
      const rel = path.relative(ROOT_DIR, absHtml);
      const content = fs.readFileSync(absHtml, 'utf8');
      if (content.toLowerCase().includes(emailLower)) {
        check7Errors.push(`${rel} にメールアドレス (${fullEmail}) が生で含まれています`);
      }
    }
    if (fs.existsSync(jsPath)) {
      const jsText = fs.readFileSync(jsPath, 'utf8');
      if (jsText.toLowerCase().includes(emailLower)) {
        check7Errors.push('assets/js/main.js にメールアドレスが生で含まれています');
      }
    }
  }
  record(7, '生成 HTML にメールアドレスがつながった形で含まれない', check7Errors);

  // 8. No emoji in HTML, CSS, JS
  const check8Errors = [];
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/u;
  for (const fileAbs of webSourceFiles) {
    const rel = path.relative(ROOT_DIR, fileAbs);
    const text = fs.readFileSync(fileAbs, 'utf8');
    const found = text.match(emojiRegex);
    if (found) {
      check8Errors.push(
        `${rel} に絵文字または異体字セレクタ (U+${found[0].codePointAt(0).toString(16).toUpperCase()}) が含まれています`
      );
    }
  }
  record(8, 'HTML・CSS・JS に絵文字が含まれない', check8Errors);

  // 9. External resource loads only fonts.googleapis.com / fonts.gstatic.com
  const check9Errors = [];
  const baseUrl =
    site && site.siteUrl
      ? site.siteUrl.endsWith('/')
        ? site.siteUrl
        : `${site.siteUrl}/`
      : '';

  for (const absHtml of htmlFiles) {
    const rel = path.relative(ROOT_DIR, absHtml);
    const content = fs.readFileSync(absHtml, 'utf8');

    const linkTags = content.match(/<link\b[^>]*>/gi) || [];
    for (const tag of linkTags) {
      const relAttr = (getAttr(tag, 'rel') || '').toLowerCase();
      const href = getAttr(tag, 'href');
      if (!href) continue;
      if (relAttr === 'canonical') {
        if (baseUrl && !href.startsWith(baseUrl)) {
          check9Errors.push(`${rel}: canonical URL が siteUrl で始まっていません: ${href}`);
        }
        continue;
      }
      if (isExternalUrl(href)) {
        try {
          const host = getHostname(href);
          if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
            check9Errors.push(`${rel}: 許可されていない外部 <link> (${href})`);
          }
        } catch {
          check9Errors.push(`${rel}: 不正な外部 <link> URL (${href})`);
        }
      }
    }

    const scriptTags = content.match(/<script\b[^>]*>/gi) || [];
    for (const tag of scriptTags) {
      const src = getAttr(tag, 'src');
      if (src && isExternalUrl(src)) {
        try {
          const host = getHostname(src);
          if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
            check9Errors.push(`${rel}: 許可されていない外部 <script> (${src})`);
          }
        } catch {
          check9Errors.push(`${rel}: 不正な外部 <script> URL (${src})`);
        }
      }
    }

    const imgTags = content.match(/<img\b[^>]*>/gi) || [];
    for (const tag of imgTags) {
      const src = getAttr(tag, 'src');
      if (src && isExternalUrl(src)) {
        try {
          const host = getHostname(src);
          if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
            check9Errors.push(`${rel}: 許可されていない外部 <img> (${src})`);
          }
        } catch {
          check9Errors.push(`${rel}: 不正な外部 <img> URL (${src})`);
        }
      }
    }
  }

  if (fs.existsSync(cssPath)) {
    const cssText = fs.readFileSync(cssPath, 'utf8');
    const urlRegex = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;
    let m;
    while ((m = urlRegex.exec(cssText)) !== null) {
      const val = m[2].trim();
      if (isExternalUrl(val)) {
        try {
          const host = getHostname(val);
          if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
            check9Errors.push(`style.css: 許可されていない外部 url() (${val})`);
          }
        } catch {
          check9Errors.push(`style.css: 不正な外部 url() (${val})`);
        }
      }
    }
    const importRegex = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/gi;
    while ((m = importRegex.exec(cssText)) !== null) {
      const val = m[1].trim();
      if (isExternalUrl(val)) {
        try {
          const host = getHostname(val);
          if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
            check9Errors.push(`style.css: 許可されていない外部 @import (${val})`);
          }
        } catch {
          check9Errors.push(`style.css: 不正な外部 @import (${val})`);
        }
      }
    }
  }
  record(9, '外部リソース読み込みが Google Fonts のみ', check9Errors);

  for (const line of results) {
    console.log(line);
  }

  if (failures.length > 0) {
    console.error(`\nチェック失敗: ${failures.length} 件の問題が見つかりました。`);
    process.exit(1);
  } else {
    console.log('\n全9項目のチェックに合格しました。');
  }
}

main();
