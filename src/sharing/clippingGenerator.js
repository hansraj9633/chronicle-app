// src/sharing/clippingGenerator.js
// Generates a "newspaper clipping" image from a post
// Uses expo-print to render themed HTML → PDF → then shares
// For a true image, ViewShot would be needed in the full native build;
// this version generates a beautifully styled single-page PDF that
// looks exactly like a newspaper clipping and can be shared/saved.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

function getMimeTypeFromUri(uri = '') {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function getFirstEmbeddedImageHtml(text) {
  const match = text.match(/!\[(.*?)\]\((.+?)\)/);
  if (!match) return '';

  const alt = match[1] || 'Selected image';
  const uri = match[2];

  try {
    let finalSrc = uri;

    if (/^file:\/\//i.test(uri)) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = getMimeTypeFromUri(uri);
      finalSrc = `data:${mime};base64,${base64}`;
    }

    return `
      <div class="clipping-image-wrap">
        <img class="clipping-image" src="${finalSrc}" alt="${alt}" />
      </div>
      <div class="clipping-rule"></div>
    `;
  } catch (e) {
    return '';
  }
}

function stripMarkdown(text, maxChars = 600) {
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,3}\s/gm, '')
    .replace(/^>\s/gm, '')
    .replace(/^-\s\[.\]\s/gm, '• ')
    .replace(/^-\s/gm, '• ')
    .replace(/^\d+\.\s/gm, '')
    .replace(/---/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
}

export async function generateClipping(post, theme, style = 'classic') {
  const previewText = stripMarkdown(post.body, 500);
  const imageHtml = await getFirstEmbeddedImageHtml(post.body || '');
  const dateStr = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const styles = {
    classic: getClassicCSS(theme),
    torn:    getTornCSS(theme),
    modern:  getModernCSS(theme),
  };

  const css = styles[style] || styles.classic;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>${css}</style>
</head>
<body>
<div class="clipping">

  <div class="clipping-header">
    <div class="pub-name">The Daily Chronicle</div>
    <div class="pub-date">${dateStr}</div>
  </div>

  <div class="clipping-rule-top"></div>

  <div class="clipping-category">${post.category}</div>

  <h1 class="clipping-headline">${post.title}</h1>

  ${post.deck ? `<p class="clipping-deck">${post.deck}</p>` : ''}

  <div class="clipping-rule"></div>

  <div class="clipping-meta">
    ${post.word_count} words &nbsp;·&nbsp; ${post.read_time} min read
    ${post.tags ? `&nbsp;·&nbsp; ${post.tags}` : ''}
  </div>

  <div class="clipping-rule"></div>

  ${imageHtml}

  <p class="clipping-body">${previewText}</p>

  <div class="clipping-footer">
    <span>Chronicle · Your Personal Newspaper</span>
    <span>${dateStr}</span>
  </div>

</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const fileName = `clipping-${post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)}.pdf`;
  const destUri = FileSystem.documentDirectory + fileName;
  await FileSystem.moveAsync({ from: uri, to: destUri });
  return destUri;
}

export async function shareClipping(post, theme, style = 'classic') {
  const uri = await generateClipping(post, theme, style);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share clipping of "${post.title}"`,
    });
  }
  return uri;
}

// ── CLIPPING STYLES ─────────────────────────────────────

function getClassicCSS(theme) {
  const fontStack = theme.titleFont === 'monospace'
    ? '"Courier New", monospace'
    : 'Georgia, "Times New Roman", serif';
  return `
    @page { size: A5; margin: 0; }
    body { margin: 0; padding: 0; background: #c8bfa8; font-family: ${fontStack}; }
    .clipping {
      background: ${theme.bg};
      margin: 28px auto;
      max-width: 420px;
      padding: 32px 36px 28px;
      box-shadow: 3px 3px 14px rgba(0,0,0,0.35), -1px -1px 8px rgba(0,0,0,0.15);
      position: relative;
    }
    .clipping::before {
      content: '';
      position: absolute;
      top: -4px; left: 10px; right: 10px;
      height: 4px;
      background: repeating-linear-gradient(90deg, ${theme.bg} 0px, ${theme.bg} 6px, transparent 6px, transparent 10px);
    }
    .clipping::after {
      content: '';
      position: absolute;
      bottom: -4px; left: 10px; right: 10px;
      height: 4px;
      background: repeating-linear-gradient(90deg, ${theme.bg} 0px, ${theme.bg} 6px, transparent 6px, transparent 10px);
    }
    .clipping-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }
    .pub-name {
      font-size: 20pt; font-weight: 900; color: ${theme.rule};
      letter-spacing: -0.5px;
    }
    .pub-date { font-size: 8pt; color: ${theme.textSecondary}; letter-spacing: 0.5px; }
    .clipping-rule-top { border: none; border-top: 3px double ${theme.rule}; margin: 6px 0 10px; }
    .clipping-category {
      font-size: 8pt; font-weight: 800; letter-spacing: 1.8px;
      text-transform: uppercase; color: ${theme.accent}; margin-bottom: 8px;
    }
    .clipping-headline {
      font-size: 22pt; font-weight: 900; line-height: 1.1;
      color: ${theme.text}; margin-bottom: 8px;
    }
    .clipping-deck {
      font-size: 11pt; font-style: italic; color: ${theme.textSecondary};
      line-height: 1.5; margin-bottom: 10px;
    }
    .clipping-rule { border: none; border-top: 1px solid ${theme.border}; margin: 8px 0; }
    .clipping-meta {
      font-size: 8pt; color: ${theme.textSecondary}; letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .clipping-image-wrap {
      margin: 12px 0;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .clipping-image {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border: 1px solid ${theme.border};
    }
    .clipping-body {
      font-size: 10pt; line-height: 1.75; color: ${theme.text}; margin: 0;
      columns: 2; column-gap: 18px; column-rule: 1px solid ${theme.border};
    }
    .clipping-body::first-letter {
      font-size: 3.2em; font-weight: 900; float: left; line-height: 0.75;
      padding: 3px 6px 0 0; color: ${theme.rule};
    }
    .clipping-footer {
      display: flex; justify-content: space-between;
      border-top: 1px solid ${theme.border}; margin-top: 16px; padding-top: 8px;
      font-size: 7.5pt; color: ${theme.textSecondary};
    }
  `;
}

function getTornCSS(theme) {
  const base = getClassicCSS(theme);
  return base.replace(
    'box-shadow: 3px 3px 14px rgba(0,0,0,0.35), -1px -1px 8px rgba(0,0,0,0.15);',
    `box-shadow: 2px 4px 18px rgba(0,0,0,0.4);
     transform: rotate(-1.2deg);`
  );
}

function getModernCSS(theme) {
  return `
    @page { size: A5; margin: 0; }
    body { margin: 0; padding: 0; background: ${theme.bg}; font-family: -apple-system, sans-serif; }
    .clipping {
      background: ${theme.card};
      margin: 24px auto;
      max-width: 420px;
      padding: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .clipping-header {
      background: ${theme.accent};
      padding: 14px 24px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .pub-name { font-size: 16pt; font-weight: 900; color: ${theme.accentText}; }
    .pub-date { font-size: 8pt; color: ${theme.accentText}; opacity: 0.8; }
    .clipping-rule-top { display: none; }
    .clipping-category {
      font-size: 8pt; font-weight: 800; letter-spacing: 1.5px;
      text-transform: uppercase; color: ${theme.accent};
      padding: 16px 24px 4px;
    }
    .clipping-headline {
      font-size: 20pt; font-weight: 900; line-height: 1.15;
      color: ${theme.text}; padding: 0 24px 8px;
    }
    .clipping-deck {
      font-size: 11pt; font-style: italic; color: ${theme.textSecondary};
      padding: 0 24px 12px; line-height: 1.5;
    }
    .clipping-rule { height: 1px; background: ${theme.border}; margin: 0 24px; }
    .clipping-meta {
      font-size: 8pt; color: ${theme.textSecondary};
      padding: 8px 24px; letter-spacing: 0.5px;
    }
    .clipping-image-wrap {
      padding: 12px 24px 4px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .clipping-image {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid ${theme.border};
    }
    .clipping-body {
      font-size: 10pt; line-height: 1.8; color: ${theme.text};
      padding: 4px 24px 20px;
    }
    .clipping-footer {
      background: ${theme.surface};
      display: flex; justify-content: space-between;
      padding: 10px 24px;
      font-size: 8pt; color: ${theme.textSecondary};
      border-top: 1px solid ${theme.border};
    }
  `;
}