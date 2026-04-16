// src/sharing/socialShare.js
// Social media sharing utilities for Chronicle

import { Share, Linking, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

// Strip markdown to plain text for sharing
export function toPlainText(body) {
  return body
    .replace(/```[\s\S]*?```/g, '[code]')
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
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/---/g, '—')
    .trim();
}

// Truncate for character-limited platforms
function truncate(text, limit, suffix = '…') {
  if (text.length <= limit) return text;
  return text.slice(0, limit - suffix.length).replace(/\s+\S*$/, '') + suffix;
}

function buildShareText(post, platform) {
  const plain = toPlainText(post.body);
  const tags = post.tags
    ? post.tags.split(',').map(t => `#${t.trim().replace(/\s+/g, '')}`).join(' ')
    : '';

  switch (platform) {
    case 'twitter': {
      // 280 chars total: title + preview + tags + attribution
      const attr = '\n\n— Chronicle';
      const tagsStr = tags ? `\n${tags}` : '';
      const reserved = post.title.length + attr.length + tagsStr.length + 4;
      const preview = truncate(plain, Math.max(0, 280 - reserved));
      return `${post.title}\n\n${preview}${tagsStr}${attr}`;
    }
    case 'linkedin': {
      const attr = '\n\n— Written in my Chronicle blog';
      const preview = truncate(plain, 1200);
      return `${post.title}\n\n${post.deck ? post.deck + '\n\n' : ''}${preview}${attr}`;
    }
    case 'whatsapp':
    case 'telegram': {
      const preview = truncate(plain, 800);
      return `*${post.title}*\n${post.deck ? '_' + post.deck + '_\n' : ''}\n${preview}\n\n_— From my Chronicle_`;
    }
    case 'instagram': {
      // Instagram doesn't support text posts via deep link, so we share caption to clipboard
      const preview = truncate(plain, 2000);
      const tagsStr = tags ? `\n\n${tags}` : '';
      return `${post.title}\n\n${post.deck ? post.deck + '\n\n' : ''}${preview}${tagsStr}\n\n#chronicle #writing #blog`;
    }
    case 'facebook': {
      const preview = truncate(plain, 600);
      return `${post.title}\n\n${preview}\n\n— Chronicle`;
    }
    default: {
      const preview = truncate(plain, 1000);
      return `${post.title}\n\n${post.deck ? post.deck + '\n\n' : ''}${preview}\n\n— Chronicle`;
    }
  }
}

// ── PLATFORM SHARE FUNCTIONS ────────────────────────────

export async function shareToTwitter(post) {
  const text = buildShareText(post, 'twitter');
  const encoded = encodeURIComponent(text);
  const url = `twitter://post?message=${encoded}`;
  const webUrl = `https://twitter.com/intent/tweet?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(url);
    await Linking.openURL(can ? url : webUrl);
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareToLinkedIn(post) {
  const text = buildShareText(post, 'linkedin');
  // LinkedIn mobile deep link
  const url = `linkedin://shareArticle?mini=true&title=${encodeURIComponent(post.title)}&summary=${encodeURIComponent(text.slice(0, 256))}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: text });
    }
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareToWhatsApp(post) {
  const text = buildShareText(post, 'whatsapp');
  const encoded = encodeURIComponent(text);
  const url = `whatsapp://send?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: text });
    }
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareToTelegram(post) {
  const text = buildShareText(post, 'telegram');
  const encoded = encodeURIComponent(text);
  const url = `tg://msg?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: text });
    }
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareToInstagram(post) {
  // Instagram doesn't allow pre-filled text, so we copy to clipboard
  const text = buildShareText(post, 'instagram');
  await Clipboard.setStringAsync(text);
  Alert.alert(
    'Opening Instagram',
    'Your post caption has been copied to clipboard.\n\nCreate a new post in Instagram and paste it.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Instagram',
        onPress: async () => {
          try {
            await Linking.openURL('instagram://');
          } catch {
            await Linking.openURL('https://www.instagram.com/');
          }
        }
      }
    ]
  );
}

export async function shareToFacebook(post) {
  const text = buildShareText(post, 'facebook');
  const url = `fb://composer/?text=${encodeURIComponent(text)}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: text });
    }
  } catch {
    await Share.share({ message: text });
  }
}

export async function copyToClipboard(post) {
  const text = buildShareText(post, 'default');
  await Clipboard.setStringAsync(text);
  return text;
}

export async function shareAsPlainText(post) {
  const text = buildShareText(post, 'default');
  await Share.share({
    title: post.title,
    message: text,
  });
}

export async function shareAsMarkdown(post) {
  const md = `# ${post.title}\n${post.deck ? `\n_${post.deck}_\n` : ''}\n**Category:** ${post.category} · **${new Date(post.created_at).toLocaleDateString()}** · ${post.word_count} words\n\n---\n\n${post.body}`;
  await Share.share({ title: post.title, message: md });
}

export const SOCIAL_PLATFORMS = [
  { id: 'twitter',   name: 'Twitter / X',  icon: 'logo-twitter',   color: '#1DA1F2', fn: shareToTwitter },
  { id: 'whatsapp',  name: 'WhatsApp',      icon: 'logo-whatsapp',  color: '#25D366', fn: shareToWhatsApp },
  { id: 'telegram',  name: 'Telegram',      icon: 'paper-plane-outline', color: '#0088cc', fn: shareToTelegram },
  { id: 'instagram', name: 'Instagram',     icon: 'logo-instagram', color: '#E1306C', fn: shareToInstagram },
  { id: 'linkedin',  name: 'LinkedIn',      icon: 'logo-linkedin',  color: '#0A66C2', fn: shareToLinkedIn },
  { id: 'facebook',  name: 'Facebook',      icon: 'logo-facebook',  color: '#1877F2', fn: shareToFacebook },
];
