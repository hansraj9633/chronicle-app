// src/editor/richText.js
// Chronicle Rich Text Engine
// Storage format: Markdown-compatible plain text with markers
// Render: parses into styled React Native segments

// ── FORMAT MARKERS ────────────────────────────────────────
// **bold**  _italic_  ++underline++  `code`
// # H1  ## H2  ### H3
// > blockquote
// - bullet  1. numbered
// --- horizontal rule
// [x] checklist checked  [ ] checklist unchecked
// ```code block```
// ![image](uri)

export function parseMarkdown(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'codeblock', content: code.trimEnd() });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', content: line.slice(4), spans: parseInline(line.slice(4)) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', content: line.slice(3), spans: parseInline(line.slice(3)) });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', content: line.slice(2), spans: parseInline(line.slice(2)) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: line.slice(2), spans: parseInline(line.slice(2)) });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Checklist
    if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
      const checked = line.startsWith('- [x] ');
      blocks.push({ type: 'checklist', checked, content: line.slice(6), spans: parseInline(line.slice(6)) });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'bullet', content: line.slice(2), spans: parseInline(line.slice(2)) });
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\. (.+)/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered',
        num: numberedMatch[1],
        content: numberedMatch[2],
        spans: parseInline(numberedMatch[2]),
      });
      i++;
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
    if (imgMatch) {
      blocks.push({ type: 'image', uri: imgMatch[1] });
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line, spans: parseInline(line) });
    i++;
  }

  return blocks;
}

export function parseInline(text) {
  // Returns array of {text, bold, italic, code, strike}
  const spans = [];
  let i = 0;
  let current = '';

  const flush = (styles = {}) => {
    if (current) {
      spans.push({ text: current, ...styles });
      current = '';
    }
  };

  while (i < text.length) {
    // Bold+italic ***
    if (text.slice(i, i + 3) === '***') {
      flush();
      const end = text.indexOf('***', i + 3);
      if (end !== -1) {
        spans.push({ text: text.slice(i + 3, end), bold: true, italic: true });
        i = end + 3;
        continue;
      }
    }

    // Bold **
    if (text.slice(i, i + 2) === '**') {
      flush();
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        spans.push({ text: text.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }

    // Italic _
    if (text[i] === '_') {
      flush();
      const end = text.indexOf('_', i + 1);
      if (end !== -1) {
        spans.push({ text: text.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }

    // Strikethrough ~~
    if (text.slice(i, i + 2) === '++') {
      flush();
      const end = text.indexOf('++', i + 2);
      if (end !== -1) {
        spans.push({ text: text.slice(i + 2, end), underline: true });
        i = end + 2;
        continue;
      }
    }

    // Inline code `
    if (text[i] === '`') {
      flush();
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        spans.push({ text: text.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }

    current += text[i];
    i++;
  }

  flush();
  return spans;
}

// ── FORMATTING HELPERS ─────────────────────────────────────

function buildSelection(start, end) {
  return { start, end };
}

export function wrapSelection(text, start, end, marker) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.max(safeStart, end);

  const before = text.slice(0, safeStart);
  const selected = text.slice(safeStart, safeEnd);
  const after = text.slice(safeEnd);

  // If nothing selected, insert placeholder and select it
  if (!selected) {
    const placeholder = 'text';
    const wrapped = `${marker}${placeholder}${marker}`;
    const nextText = before + wrapped + after;

    return {
      text: nextText,
      cursor: safeStart + wrapped.length,
      selection: buildSelection(
        safeStart + marker.length,
        safeStart + marker.length + placeholder.length
      ),
    };
  }

  const wrapped = `${marker}${selected}${marker}`;
  const nextText = before + wrapped + after;

  return {
    text: nextText,
    cursor: safeStart + wrapped.length,
    selection: buildSelection(
      safeStart + marker.length,
      safeStart + marker.length + selected.length
    ),
  };
}

export function insertBlock(text, cursor, block) {
  const safeCursor = Math.max(0, cursor);

  const before = text.slice(0, safeCursor);
  const after = text.slice(safeCursor);

  const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
  const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');

  const insert =
    (needsLeadingNewline ? '\n' : '') +
    block +
    (needsTrailingNewline ? '\n' : '');

  const nextText = before + insert + after;
  const cursorPos = before.length + insert.length;

  return {
    text: nextText,
    cursor: cursorPos,
    selection: buildSelection(cursorPos, cursorPos),
  };
}

export function toggleLinePrefix(text, cursor, prefix) {
  const lines = text.split('\n');

  let charCount = 0;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      lineIndex = i;
      break;
    }
    charCount += lineLength + 1;
    lineIndex = i;
  }

  const line = lines[lineIndex] || '';

  if (line.startsWith(prefix)) {
    lines[lineIndex] = line.slice(prefix.length);
  } else {
    lines[lineIndex] = prefix + line;
  }

  return lines.join('\n');
}

export function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readTime(wc) {
  return Math.max(1, Math.ceil(wc / 200));
}