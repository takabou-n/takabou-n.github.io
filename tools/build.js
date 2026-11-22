'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const WORKS_OUT_DIR = path.join(ROOT_DIR, 'works');

const NOSCRIPT_MAIL_TEXT =
  'メールアドレスを表示するには JavaScript を有効にしてください。公式LINEからもご相談いただけます。';

/**
 * Escape special HTML characters without altering text content.
 * @param {string} value
 * @returns {string}
 */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Read intrinsic width and height from a PNG or JPEG file.
 * @param {string} relPath
 * @returns {{ width: number, height: number }}
 */
function getImageDimensions(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  const buf = fs.readFileSync(absPath);

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }

  // JPEG signature: FF D8
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 3 < buf.length) {
      while (offset < buf.length && buf[offset] === 0xff) {
        offset += 1;
      }
      if (offset >= buf.length) break;
      const marker = buf[offset];
      offset += 1;

      // Standalone markers (TEM, RST0..7, SOI, EOI)
      if (
        marker === 0x00 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd9)
      ) {
        continue;
      }

      if (offset + 2 > buf.length) break;
      const segmentLength = buf.readUInt16BE(offset);

      // SOF markers containing image dimensions
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 7 <= buf.length) {
          return {
            height: buf.readUInt16BE(offset + 3),
            width: buf.readUInt16BE(offset + 5),
          };
        }
        break;
      }

      if (segmentLength < 2) break;
      offset += segmentLength;
    }
  }

  throw new Error(`画像の縦横サイズを取得できませんでした: ${relPath}`);
}

/**
 * Render an <img> tag with intrinsic dimensions and optional lazy loading.
 * @param {string} relPath
 * @param {string} alt
 * @param {string} relPrefix
 * @param {{ className?: string, lazy?: boolean }} [opts]
 * @returns {string}
 */
function renderImage(relPath, alt, relPrefix, opts = {}) {
  const { width, height } = getImageDimensions(relPath);
  const attrs = [
    `src="${esc(relPrefix + relPath)}"`,
    `alt="${esc(alt)}"`,
    `width="${width}"`,
    `height="${height}"`,
  ];
  if (opts.className) {
    attrs.push(`class="${esc(opts.className)}"`);
  }
  if (opts.lazy !== false) {
    attrs.push('loading="lazy"');
  }
  return `<img ${attrs.join(' ')}>`;
}

/**
 * Render common <head> markup.
 * @param {object} params
 * @returns {string}
 */
function renderHead({
  title,
  description,
  canonicalUrl,
  ogImageUrl,
  ogType,
  relPrefix,
}) {
  return [
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${esc(title)}</title>`,
    `  <meta name="description" content="${esc(description)}">`,
    `  <link rel="canonical" href="${esc(canonicalUrl)}">`,
    `  <link rel="icon" type="image/png" href="${esc(relPrefix)}assets/img/icon.png">`,
    `  <meta property="og:title" content="${esc(title)}">`,
    `  <meta property="og:description" content="${esc(description)}">`,
    `  <meta property="og:image" content="${esc(ogImageUrl)}">`,
    `  <meta property="og:url" content="${esc(canonicalUrl)}">`,
    `  <meta property="og:type" content="${esc(ogType)}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
    '  <link rel="preconnect" href="https://fonts.googleapis.com">',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap">',
    `  <link rel="stylesheet" href="${esc(relPrefix)}assets/css/style.css">`,
    `  <script src="${esc(relPrefix)}assets/js/main.js" defer></script>`,
    '</head>',
  ].join('\n');
}

/**
 * Render sticky top header bar.
 * @param {object} site
 * @param {string} relPrefix
 * @param {string} contactHref
 * @returns {string}
 */
function renderHeader(site, relPrefix, contactHref) {
  const iconImg = renderImage(site.icon, site.iconAlt, relPrefix, {
    className: 'header-icon',
    lazy: false,
  });
  return [
    '<header class="site-header">',
    '  <div class="container header-inner">',
    `    <a class="site-brand" href="${esc(relPrefix)}index.html">`,
    `      ${iconImg}`,
    `      <span class="site-brand-name">${esc(site.name)}</span>`,
    '    </a>',
    `    <a class="btn btn-primary btn-header" href="${esc(contactHref)}">問い合わせ</a>`,
    '  </div>',
    '</header>',
  ].join('\n');
}

/**
 * Render footer.
 * @param {object} site
 * @param {{ hasBottomBar?: boolean }} [opts]
 * @returns {string}
 */
function renderFooter(site, opts = {}) {
  const cls = opts.hasBottomBar
    ? 'site-footer site-footer-with-bar'
    : 'site-footer';
  return [
    `<footer class="${cls}">`,
    '  <div class="container">',
    `    <p class="footer-text">${esc(site.footer)}</p>`,
    '  </div>',
    '</footer>',
  ].join('\n');
}

/**
 * Render fixed bottom CTA bar.
 * @param {object} site
 * @returns {string}
 */
function renderBottomBar(site) {
  return [
    '<div class="bottom-bar" id="bottom-bar">',
    '  <div class="container bottom-bar-inner">',
    `    <p class="bottom-bar-lead">${esc(site.contactLead)}</p>`,
    '    <a class="btn btn-primary btn-bottom-bar" href="#contact">相談する</a>',
    '  </div>',
    '</div>',
  ].join('\n');
}

/**
 * Render mail placeholder + noscript fallback (never embeds raw email address).
 * @param {object} mail
 * @returns {string}
 */
function renderMailSlot(mail) {
  return [
    `<div class="js-mail-slot" data-u="${esc(mail.user)}" data-d="${esc(mail.domain)}" data-s="${esc(mail.subject)}" data-l="${esc(mail.label)}"></div>`,
    `<noscript><p class="mail-noscript">${esc(NOSCRIPT_MAIL_TEXT)}</p></noscript>`,
  ].join('\n');
}

/**
 * Render the about section items inside <details id="about">.
 * @param {Array<object>} aboutList
 * @returns {string}
 */
function renderAboutSection(aboutList) {
  const groups = aboutList
    .map((sec) => {
      const parts = [
        '<article class="about-group">',
        `  <h2 id="${esc(sec.id)}" class="about-heading">${esc(sec.heading)}</h2>`,
      ];

      if (Array.isArray(sec.blocks)) {
        const blocksHtml = sec.blocks
          .map((block) => {
            const lis = block.items
              .map((item) => `<li>${esc(item)}</li>`)
              .join('\n          ');
            return [
              '  <div class="about-block">',
              `    <h3 class="about-block-title">${esc(block.title)}</h3>`,
              `    <p class="about-block-lead">${esc(block.lead)}</p>`,
              '    <ul class="about-list">',
              `          ${lis}`,
              '    </ul>',
              '  </div>',
            ].join('\n');
          })
          .join('\n');
        parts.push('<div class="about-blocks">', blocksHtml, '</div>');
      } else if (Array.isArray(sec.items)) {
        const lis = sec.items
          .map((item) => `  <li>${esc(item)}</li>`)
          .join('\n    ');
        parts.push('<ul class="about-list">', lis, '</ul>');
      }

      if (sec.note) {
        parts.push(`  <p class="about-note">${esc(sec.note)}</p>`);
      }

      parts.push('</article>');
      return parts.join('\n');
    })
    .join('\n');

  return [
    '<section class="about-section">',
    '  <div class="container">',
    '    <details id="about" class="about-details">',
    '      <summary class="about-summary"><span class="about-summary-text">プロフィールをくわしく見る</span></summary>',
    '      <div class="about-body">',
    groups,
    '      </div>',
    '    </details>',
    '  </div>',
    '</section>',
  ].join('\n');
}

/**
 * Render a work or pinned card.
 * @param {object} params
 * @returns {string}
 */
function renderCard({
  href,
  imagePath,
  imageAlt,
  title,
  badgeText,
  relPrefix,
  catSlug,
  isPinned = false,
}) {
  const thumb = renderImage(imagePath, imageAlt, relPrefix, {
    className: 'card-image',
    lazy: true,
  });
  const dataAttrs = [];
  if (catSlug) {
    dataAttrs.push(`data-cat="${esc(catSlug)}"`);
  }
  if (isPinned) {
    dataAttrs.push('data-pinned="true"');
  }
  const badgeClass = isPinned ? 'card-badge card-badge-pinned' : 'card-badge';

  return [
    `<a class="work-card" href="${esc(href)}"${dataAttrs.length ? ' ' + dataAttrs.join(' ') : ''}>`,
    `  <div class="card-thumb">${thumb}</div>`,
    '  <div class="card-body">',
    `    <h3 class="card-title">${esc(title)}</h3>`,
    `    <span class="${badgeClass}">${esc(badgeText)}</span>`,
    '  </div>',
    '</a>',
  ].join('\n');
}

/**
 * Build top page HTML (index.html).
 * @param {object} site
 * @param {object} worksData
 * @param {Map<string, string>} categorySlugMap
 * @returns {string}
 */
function buildIndexHtml(site, worksData, categorySlugMap) {
  const baseUrl = site.siteUrl.endsWith('/') ? site.siteUrl : `${site.siteUrl}/`;
  const head = renderHead({
    title: site.siteTitle,
    description: site.siteDescription,
    canonicalUrl: baseUrl,
    ogImageUrl: baseUrl + site.ogImage,
    ogType: 'website',
    relPrefix: '',
  });

  const profileIcon = renderImage(site.icon, site.iconAlt, '', {
    className: 'profile-icon',
    lazy: false,
  });

  const catchHtml = site.catch
    .map((line) => `<p class="profile-catch-line">${esc(line)}</p>`)
    .join('\n        ');

  const tabsHtml = worksData.categories
    .map((cat, idx) => {
      const active = idx === 0;
      return `<button type="button" role="tab" class="category-tab${active ? ' is-active' : ''}" data-cat="${esc(cat.slug)}" aria-selected="${active ? 'true' : 'false'}">${esc(cat.name)}</button>`;
    })
    .join('\n        ');

  const pinnedCards = site.pinned.map((pin) =>
    renderCard({
      href: pin.href,
      imagePath: pin.image,
      imageAlt: pin.alt,
      title: pin.title,
      badgeText: 'はじめに',
      relPrefix: '',
      catSlug: 'all',
      isPinned: true,
    })
  );

  const workCards = worksData.works.map((work) => {
    const slug = categorySlugMap.get(work.category);
    return renderCard({
      href: `works/${work.id}.html`,
      imagePath: work.card,
      imageAlt: work.cardAlt,
      title: work.title,
      badgeText: work.category,
      relPrefix: '',
      catSlug: slug,
      isPinned: false,
    });
  });

  const qrImg = renderImage(site.contact.line.qr, site.contact.line.qrAlt, '', {
    className: 'contact-qr',
    lazy: true,
  });

  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    head,
    '<body>',
    renderHeader(site, '', '#contact'),
    '<main class="site-main">',
    '  <section class="profile-section" id="top">',
    '    <div class="container profile-inner">',
    `      ${profileIcon}`,
    `      <p class="profile-role">${esc(site.role)}</p>`,
    `      <h1 class="profile-name">${esc(site.name)}</h1>`,
    `      <p class="profile-region"><span class="region-dot" aria-hidden="true"></span><span>${esc(site.region)}</span></p>`,
    '      <div class="profile-catch">',
    `        ${catchHtml}`,
    '      </div>',
    '      <div class="profile-cta">',
    `        <p class="profile-contact-lead">${esc(site.contactLead)}</p>`,
    '        <a class="btn btn-primary" href="#contact">相談する</a>',
    '      </div>',
    '    </div>',
    '  </section>',
    renderAboutSection(site.about),
    '  <section class="works-section" aria-label="作品一覧">',
    '    <div class="container">',
    '      <div class="category-tabs" role="tablist" aria-label="カテゴリ">',
    `        ${tabsHtml}`,
    '      </div>',
    '      <div class="card-grid" id="card-grid">',
    pinnedCards.concat(workCards).join('\n'),
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="contact-section" id="contact">',
    '    <div class="container">',
    '      <div class="contact-panel">',
    `        <h2 class="section-heading">${esc(site.contact.heading)}</h2>`,
    `        <p class="contact-lead">${esc(site.contact.lead)}</p>`,
    '        <div class="contact-grid">',
    '          <div class="contact-box">',
    `            <a class="btn btn-primary" href="${esc(site.contact.line.url)}" target="_blank" rel="noopener noreferrer">${esc(site.contact.line.label)}</a>`,
    `            <div class="contact-qr-wrap">${qrImg}</div>`,
    `            <p class="contact-qr-note">${esc(site.contact.line.qrNote)}</p>`,
    '          </div>',
    '          <div class="contact-box contact-box-mail">',
    `            ${renderMailSlot(site.contact.mail)}`,
    '          </div>',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </section>',
    '</main>',
    renderFooter(site, { hasBottomBar: true }),
    renderBottomBar(site),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/**
 * Render grouped gallery items by kind.
 * @param {Array<object>} gallery
 * @param {string} relPrefix
 * @returns {string}
 */
function renderGalleryGroups(gallery, relPrefix) {
  const groups = [];
  for (const item of gallery) {
    const last = groups[groups.length - 1];
    if (item.kind !== 'pc' && last && last.kind === item.kind) {
      last.items.push(item);
    } else {
      groups.push({ kind: item.kind, items: [item] });
    }
  }

  return groups
    .map((group) => {
      const renderItemMedia = (item, className) => {
        const img = renderImage(item.src, item.alt, relPrefix, {
          className,
          lazy: true,
        });
        if (item.url) {
          return `<a class="gallery-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${img}</a>`;
        }
        return img;
      };

      if (group.kind === 'pc') {
        const item = group.items[0];
        return [
          '<div class="browser-frame">',
          '  <div class="browser-bar" aria-hidden="true">',
          '    <span class="browser-dot"></span>',
          '    <span class="browser-dot"></span>',
          '    <span class="browser-dot"></span>',
          '  </div>',
          `  <div class="browser-body">${renderItemMedia(item, 'gallery-img-pc')}</div>`,
          '</div>',
        ].join('\n');
      }

      if (group.kind === 'sp') {
        const frames = group.items
          .map(
            (item) =>
              `<div class="phone-frame"><div class="phone-screen">${renderItemMedia(item, 'gallery-img-sp')}</div></div>`
          )
          .join('\n');
        return `<div class="sp-grid">\n${frames}\n</div>`;
      }

      if (group.kind === 'sticker') {
        const cells = group.items
          .map(
            (item) =>
              `<div class="sticker-item">${renderItemMedia(item, 'gallery-img-sticker')}</div>`
          )
          .join('\n');
        return `<div class="sticker-board"><div class="sticker-grid">\n${cells}\n</div></div>`;
      }

      if (group.kind === 'wide') {
        const cells = group.items
          .map(
            (item) =>
              `<div class="wide-item">${renderItemMedia(item, 'gallery-img-wide')}</div>`
          )
          .join('\n');
        return `<div class="wide-grid">\n${cells}\n</div>`;
      }

      throw new Error(`未対応の gallery kind です: ${group.kind}`);
    })
    .join('\n');
}

/**
 * Build individual work detail HTML (works/<id>.html).
 * @param {object} site
 * @param {object} work
 * @param {Array<object>} allWorks
 * @param {Map<string, string>} categorySlugMap
 * @returns {string}
 */
function buildWorkHtml(site, work, allWorks, categorySlugMap) {
  const relPrefix = '../';
  const baseUrl = site.siteUrl.endsWith('/') ? site.siteUrl : `${site.siteUrl}/`;
  const catSlug = categorySlugMap.get(work.category);
  const head = renderHead({
    title: `${work.title}｜${site.name}`,
    description: work.description[0],
    canonicalUrl: `${baseUrl}works/${work.id}.html`,
    ogImageUrl: baseUrl + work.card,
    ogType: 'article',
    relPrefix,
  });

  const heroImg = renderImage(work.card, work.cardAlt, relPrefix, {
    className: 'work-hero-img',
    lazy: true,
  });

  const descParagraphs = work.description
    .map((line) => `<p>${esc(line)}</p>`)
    .join('\n        ');

  const roleTags = work.role
    .map((r) => `<li class="role-tag">${esc(r)}</li>`)
    .join('');

  const noteRow =
    work.note && work.note.trim() !== ''
      ? `\n        <div class="meta-row"><dt>補足</dt><dd>${esc(work.note)}</dd></div>`
      : '';

  const linksHtml = work.links
    .map(
      (link) =>
        `<a class="btn btn-primary" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`
    )
    .join('\n        ');

  const otherWorks = allWorks
    .filter((item) => item.id !== work.id)
    .slice(0, 3)
    .map((other) =>
      renderCard({
        href: `${other.id}.html`,
        imagePath: other.card,
        imageAlt: other.cardAlt,
        title: other.title,
        badgeText: other.category,
        relPrefix,
        catSlug: categorySlugMap.get(other.category),
        isPinned: false,
      })
    )
    .join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    head,
    '<body>',
    renderHeader(site, relPrefix, '#contact'),
    '<main class="site-main work-main">',
    '  <div class="container">',
    '    <nav class="breadcrumb" aria-label="パンくずリスト">',
    `      <a href="../index.html">${esc(site.name)}</a>`,
    '      <span class="breadcrumb-sep" aria-hidden="true">＞</span>',
    `      <a href="../index.html#cat=${esc(catSlug)}">${esc(work.category)}</a>`,
    '      <span class="breadcrumb-sep" aria-hidden="true">＞</span>',
    `      <span aria-current="page">${esc(work.title)}</span>`,
    '    </nav>',
    '    <header class="work-header">',
    `      <h1 class="work-title">${esc(work.title)}</h1>`,
    `      <span class="card-badge">${esc(work.category)}</span>`,
    '    </header>',
    `    <div class="work-hero">${heroImg}</div>`,
    '    <section class="work-description" aria-label="作品の説明">',
    `      ${descParagraphs}`,
    '    </section>',
    '    <dl class="work-meta">',
    `      <div class="meta-row"><dt>担当した範囲</dt><dd><ul class="role-tags">${roleTags}</ul></dd></div>`,
    `      <div class="meta-row"><dt>使った道具</dt><dd>${esc(work.tools.join('・'))}</dd></div>`,
    `      <div class="meta-row"><dt>時期</dt><dd>${esc(work.period)}</dd></div>${noteRow}`,
    '    </dl>',
    '    <div class="work-links">',
    `      ${linksHtml}`,
    '    </div>',
    '    <section class="work-gallery">',
    '      <h2 class="section-heading">画面・作品</h2>',
    '      <div class="gallery-stack">',
    renderGalleryGroups(work.gallery, relPrefix),
    '      </div>',
    '    </section>',
    '    <section class="work-contact" id="contact">',
    '      <div class="work-contact-panel">',
    `        <p class="work-contact-lead">${esc(site.contactLead)}</p>`,
    '        <div class="work-contact-actions">',
    `          <a class="btn btn-primary" href="${esc(site.contact.line.url)}" target="_blank" rel="noopener noreferrer">${esc(site.contact.line.label)}</a>`,
    `          ${renderMailSlot(site.contact.mail)}`,
    '        </div>',
    '      </div>',
    '    </section>',
    '    <section class="other-works">',
    '      <h2 class="section-heading">ほかの作品</h2>',
    '      <div class="card-grid">',
    otherWorks,
    '      </div>',
    '    </section>',
    '  </div>',
    '</main>',
    renderFooter(site, { hasBottomBar: true }),
    renderBottomBar(site),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/**
 * Build 404.html.
 * @param {object} site
 * @returns {string}
 */
function build404Html(site) {
  const baseUrl = site.siteUrl.endsWith('/') ? site.siteUrl : `${site.siteUrl}/`;
  const head = renderHead({
    title: `ページが見つかりませんでした｜${site.name}`,
    description: 'ページが見つかりませんでした',
    canonicalUrl: `${baseUrl}404.html`,
    ogImageUrl: baseUrl + site.ogImage,
    ogType: 'website',
    relPrefix: '',
  });

  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    head,
    '<body>',
    renderHeader(site, '', 'index.html#contact'),
    '<main class="site-main not-found-main">',
    '  <div class="container not-found-inner">',
    '    <h1 class="not-found-title">ページが見つかりませんでした</h1>',
    '    <a class="btn btn-primary" href="index.html">作品一覧へ戻る</a>',
    '  </div>',
    '</main>',
    renderFooter(site, { hasBottomBar: false }),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/**
 * Build sitemap.xml deterministically (no timestamps).
 * @param {object} site
 * @param {object} worksData
 * @returns {string}
 */
function buildSitemapXml(site, worksData) {
  const baseUrl = site.siteUrl.endsWith('/') ? site.siteUrl : `${site.siteUrl}/`;
  const urls = [baseUrl].concat(
    worksData.works.map((w) => `${baseUrl}works/${w.id}.html`)
  );
  const items = urls
    .map((u) => `  <url>\n    <loc>${esc(u)}</loc>\n  </url>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Build robots.txt.
 * @param {object} site
 * @returns {string}
 */
function buildRobotsTxt(site) {
  const baseUrl = site.siteUrl.endsWith('/') ? site.siteUrl : `${site.siteUrl}/`;
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * Write UTF-8 text file cleanly.
 * @param {string} absPath
 * @param {string} content
 */
function writeText(absPath, content) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
}

function main() {
  const site = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf8')
  );
  const worksData = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'works.json'), 'utf8')
  );

  const categorySlugMap = new Map();
  for (const cat of worksData.categories) {
    categorySlugMap.set(cat.name, cat.slug);
  }
  for (const work of worksData.works) {
    if (!categorySlugMap.has(work.category)) {
      throw new Error(
        `作品 ${work.id} のカテゴリ "${work.category}" が categories にありません`
      );
    }
  }

  fs.mkdirSync(WORKS_OUT_DIR, { recursive: true });
  const expectedFiles = new Set(worksData.works.map((w) => `${w.id}.html`));
  for (const existing of fs.readdirSync(WORKS_OUT_DIR)) {
    if (existing.endsWith('.html') && !expectedFiles.has(existing)) {
      fs.unlinkSync(path.join(WORKS_OUT_DIR, existing));
    }
  }

  writeText(
    path.join(ROOT_DIR, 'index.html'),
    buildIndexHtml(site, worksData, categorySlugMap)
  );

  for (const work of worksData.works) {
    writeText(
      path.join(WORKS_OUT_DIR, `${work.id}.html`),
      buildWorkHtml(site, work, worksData.works, categorySlugMap)
    );
  }

  writeText(path.join(ROOT_DIR, '404.html'), build404Html(site));
  writeText(path.join(ROOT_DIR, 'sitemap.xml'), buildSitemapXml(site, worksData));
  writeText(path.join(ROOT_DIR, 'robots.txt'), buildRobotsTxt(site));

  console.log(
    `build complete: index.html, 404.html, sitemap.xml, robots.txt, and ${worksData.works.length} work pages`
  );
}

main();
