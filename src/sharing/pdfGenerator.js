// src/sharing/pdfGenerator.js
// Generates a beautifully themed PDF from a Chronicle post using expo-print

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

async function convertMarkdownImagesToEmbeds(text) {
  const imageRegex = /!\[(.*?)\]\((.+?)\)/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const alt = match[1] || 'Image';
    const uri = match[2];

    result += text.slice(lastIndex, match.index);

    try {
      let finalSrc = uri;

      if (/^file:\/\//i.test(uri)) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mime = getMimeTypeFromUri(uri);
        finalSrc = `data:${mime};base64,${base64}`;
      }

      result += `![${alt}](${finalSrc})`;
    } catch (e) {
      // If image can't be read, keep original markdown so export doesn't crash
      result += fullMatch;
    }

    lastIndex = match.index + fullMatch.length;
  }

  result += text.slice(lastIndex);
  return result;
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, (m) => `<pre><code>${m.slice(3, -3).trim()}</code></pre>`)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="checked">✓ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="unchecked">☐ $1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/!\[.*?\]\((.+?)\)/g, '<img src="$1" style="max-width:100%;border-radius:4px;margin:12px 0;display:block;break-inside:avoid;page-break-inside:avoid;">')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

function getThemeCSS(theme) {
  const fontStack = theme.titleFont === 'monospace'
    ? '"Courier New", Courier, monospace'
    : 'Georgia, "Times New Roman", serif';
  const bodyStack = theme.bodyFont === 'monospace'
    ? '"Courier New", Courier, monospace'
    : 'Georgia, "Times New Roman", serif';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${theme.bg};
      color: ${theme.text};
      font-family: ${bodyStack};
      font-size: 11pt;
      line-height: 1.8;
      padding: 0;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 56px 60px;
      background: ${theme.bg};
      min-height: 100vh;
    }
    .masthead {
      text-align: center;
      border-bottom: 3px double ${theme.rule};
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .masthead-name {
      font-family: ${fontStack};
      font-size: 11pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${theme.textSecondary};
      margin-bottom: 4px;
    }
    .masthead-app {
      font-size: 28pt;
      font-weight: 900;
      color: ${theme.rule};
      font-family: ${fontStack};
      letter-spacing: -1px;
    }
    .masthead-date {
      font-size: 9pt;
      color: ${theme.textSecondary};
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .category-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .category-badge {
      border: 1px solid ${theme.accent};
      padding: 2px 10px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${theme.accent};
    }
    .status-badge {
      border: 1px solid ${theme.textSecondary};
      padding: 2px 10px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${theme.textSecondary};
    }
    h1.post-title {
      font-family: ${fontStack};
      font-size: 28pt;
      font-weight: 900;
      line-height: 1.15;
      color: ${theme.text};
      margin-bottom: 10px;
    }
    .post-deck {
      font-size: 13pt;
      font-style: italic;
      color: ${theme.textSecondary};
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .double-rule {
      border: none;
      border-top: 2px solid ${theme.rule};
      margin: 4px 0;
    }
    .single-rule {
      border: none;
      border-top: 1px solid ${theme.rule};
      margin: 4px 0 14px;
    }
    .meta-row {
      font-size: 9pt;
      color: ${theme.textSecondary};
      letter-spacing: 0.5px;
      margin: 12px 0;
      display: flex;
      gap: 12px;
    }
    .meta-dot { color: ${theme.border}; }
    .tags-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .tag {
      border: 1px solid ${theme.border};
      padding: 1px 7px;
      font-size: 8pt;
      color: ${theme.textSecondary};
      letter-spacing: 0.5px;
    }
    .body-content {
      margin-top: 8px;
      columns: ${theme.cardStyle === 'minimal' ? 1 : 2};
      column-gap: 28px;
      column-rule: 1px solid ${theme.border};
    }
    .body-content p { margin-bottom: 10px; }
    .body-content h1 { font-size: 16pt; font-weight: 900; margin: 16px 0 6px; font-family: ${fontStack}; column-span: all; }
    .body-content h2 { font-size: 14pt; font-weight: 800; margin: 14px 0 5px; font-family: ${fontStack}; }
    .body-content h3 { font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${theme.accent}; margin: 12px 0 4px; }
    .body-content blockquote {
      border-left: 3px solid ${theme.accent};
      padding: 6px 14px;
      font-style: italic;
      color: ${theme.textSecondary};
      background: ${theme.surface};
      margin: 10px 0;
    }
    .body-content pre {
      background: ${theme.surface};
      border: 1px solid ${theme.border};
      padding: 12px;
      font-family: "Courier New", monospace;
      font-size: 9pt;
      margin: 10px 0;
      white-space: pre-wrap;
      column-span: all;
    }
    .body-content code {
      font-family: "Courier New", monospace;
      background: rgba(128,128,128,0.1);
      padding: 1px 4px;
      font-size: 9pt;
    }
    .body-content hr { border: none; border-top: 2px solid ${theme.rule}; margin: 14px 0; column-span: all; }
    .body-content li { margin-left: 18px; margin-bottom: 4px; }
    .body-content li.checked { color: ${theme.textSecondary}; text-decoration: line-through; }
    .footer-rule { border: none; border-top: 1px solid ${theme.border}; margin: 32px 0 12px; }
    .footer {
      font-size: 8.5pt;
      color: ${theme.textSecondary};
      display: flex;
      justify-content: space-between;
      letter-spacing: 0.5px;
    }
    .dropcap::first-letter {
      font-size: 3.8em;
      font-weight: 900;
      float: left;
      line-height: 0.75;
      padding: 4px 8px 0 0;
      color: ${theme.rule};
      font-family: ${fontStack};
    }
  `;
}

export async function generatePostPDF(post, theme) {
  const bodyWithEmbeddedImages = await convertMarkdownImagesToEmbeds(post.body || '');
  const bodyHtml = stripMarkdown(bodyWithEmbeddedImages);

  const dateStr = new Date(post.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const tags = post.tags
    ? post.tags.split(',').map(t => t.trim()).filter(Boolean)
        .map(t => `<span class="tag">${t}</span>`).join('')
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>${getThemeCSS(theme)}</style>
</head>
<body>
<div class="page">

  <div class="masthead">
    <div class="masthead-name">Chronicle · Personal Blog</div>
    <div class="masthead-app">The Daily Chronicle</div>
    <div class="masthead-date">${dateStr}</div>
  </div>

  <div class="category-row">
    <span class="category-badge">${post.category}</span>
    ${post.status === 'draft' ? '<span class="status-badge">Draft</span>' : ''}
  </div>

  <h1 class="post-title">${post.title}</h1>
  ${post.deck ? `<p class="post-deck">${post.deck}</p>` : ''}

  <hr class="double-rule"/>
  <hr class="single-rule"/>

  <div class="meta-row">
    <span>${dateStr}</span>
    <span class="meta-dot">·</span>
    <span>${post.word_count} words</span>
    <span class="meta-dot">·</span>
    <span>${post.read_time} min read</span>
  </div>

  ${tags ? `<div class="tags-row">${tags}</div>` : ''}

  <div class="body-content">
    <p class="dropcap">${bodyHtml}</p>
  </div>

  <hr class="footer-rule"/>
  <div class="footer">
    <span>Chronicle · Your Personal Newspaper</span>
    <span>Exported ${new Date().toLocaleDateString()}</span>
  </div>

</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Move to a named file
  const fileName = `chronicle-${post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}.pdf`;
  const destUri = FileSystem.documentDirectory + fileName;
  await FileSystem.moveAsync({ from: uri, to: destUri });

  return destUri;
}

export async function sharePostAsPDF(post, theme) {
  const uri = await generatePostPDF(post, theme);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share "${post.title}"`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}