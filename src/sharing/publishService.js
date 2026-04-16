// src/sharing/publishService.js
// Phase 5: Publish to Medium and Substack

import { toPlainText } from './socialShare';

// ── MEDIUM ────────────────────────────────────────────────

export async function publishToMedium(post, integrationToken) {
  if (!integrationToken?.trim()) {
    throw new Error('Medium integration token required. Get it from medium.com/me/settings → Integration Tokens.');
  }

  // First get the user ID
  const meRes = await fetch('https://api.medium.com/v1/me', {
    headers: {
      Authorization: `Bearer ${integrationToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!meRes.ok) {
    const err = await meRes.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || `Medium auth failed (${meRes.status}). Check your token.`);
  }

  const me = await meRes.json();
  const userId = me.data.id;

  // Convert markdown body to HTML for Medium
  const contentHtml = markdownToMediumHtml(post);

  const body = {
    title: post.title,
    contentFormat: 'html',
    content: contentHtml,
    tags: post.tags
      ? post.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
      : [],
    publishStatus: 'draft', // always draft first for safety
  };

  const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${integrationToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!postRes.ok) {
    const err = await postRes.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.message || `Failed to publish (${postRes.status})`);
  }

  const result = await postRes.json();
  return {
    url: result.data.url,
    id: result.data.id,
    platform: 'Medium',
    status: 'draft',
  };
}

// ── SUBSTACK ──────────────────────────────────────────────

export async function publishToSubstack(post, substackConfig) {
  const { publicationUrl, email, password } = substackConfig;

  if (!publicationUrl?.trim()) {
    throw new Error('Substack publication URL required (e.g. yourblog.substack.com).');
  }

  // Substack doesn't have a public API — we prepare the post content
  // and open the draft creation page with pre-filled data as best we can.
  // Full API access requires Substack Publisher API (beta invite only).

  const plain = toPlainText(post.body);
  const substackDraft = {
    title: post.title,
    subtitle: post.deck || '',
    body: plain,
    tags: post.tags || '',
  };

  // Return the content formatted for manual paste — the URL opens the composer
  const composerUrl = `https://${publicationUrl.replace(/^https?:\/\//, '')}/publish/post`;
  return {
    url: composerUrl,
    draft: substackDraft,
    platform: 'Substack',
    note: 'Substack does not have a public write API. Open the composer and paste your content.',
  };
}

// ── MARKDOWN → HTML FOR MEDIUM ────────────────────────────

function markdownToMediumHtml(post) {
  let body = post.body;

  // Code blocks first (before other replacements)
  body = body.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  );

  // Inline formats
  body = body
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

  // Block elements
  body = body
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^- \[x\] (.+)$/gm, '<li><s>$1</s></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1"/>');

  // Paragraphs
  body = body
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  const deck = post.deck ? `<h4>${post.deck}</h4>` : '';
  const tags = post.tags
    ? `<p><em>Tags: ${post.tags}</em></p>`
    : '';
  const footer = `<hr/><p><em>Originally written in <strong>Chronicle</strong> — my personal newspaper blog.</em></p>`;

  return `${deck}<p>${body}</p>${tags}${footer}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
