// src/components/MarkdownRenderer.js
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { parseMarkdown } from '../editor/richText';
import { useTheme } from '../themes/ThemeContext';

function InlineSpans({ spans, baseStyle }) {
  if (!spans || spans.length === 0) return null;
  return (
    <Text style={baseStyle}>
      {spans.map((span, i) => {
        const style = [
          baseStyle,
          span.bold && { fontWeight: '700' },
          span.italic && { fontStyle: 'italic' },
          span.underline && { textDecorationLine: 'underline' },
          span.code && styles.inlineCode,
        ].filter(Boolean);
        return <Text key={i} style={style}>{span.text}</Text>;
      })}
    </Text>
  );
}

function ChecklistItem({ block, theme, index, onToggle }) {
  const [checked, setChecked] = useState(block.checked);
  const toggle = () => {
    setChecked(!checked);
    onToggle && onToggle(index, !checked);
  };
  return (
    <TouchableOpacity style={styles.checkRow} onPress={toggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, { borderColor: theme.accent, backgroundColor: checked ? theme.accent : 'transparent' }]}>
        {checked && <Text style={{ color: theme.accentText, fontSize: 10, fontWeight: '900' }}>✓</Text>}
      </View>
      <Text style={[styles.checkText, { color: checked ? theme.textSecondary : theme.text, textDecorationLine: checked ? 'line-through' : 'none' }]}>
        {block.content}
      </Text>
    </TouchableOpacity>
  );
}

export default function MarkdownRenderer({ text, fontSize = 17, onChecklistToggle }) {
  const { theme } = useTheme();
  const blocks = parseMarkdown(text);

  const baseText = {
    fontSize,
    lineHeight: fontSize * 1.75,
    color: theme.text,
    fontFamily: theme.bodyFont === 'monospace' ? 'monospace' : undefined,
  };

  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return (
              <Text key={i} style={[styles.h1, { color: theme.text, fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' }]}>
                {block.content}
              </Text>
            );
          case 'h2':
            return (
              <Text key={i} style={[styles.h2, { color: theme.text, fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' }]}>
                {block.content}
              </Text>
            );
          case 'h3':
            return (
              <Text key={i} style={[styles.h3, { color: theme.text, fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' }]}>
                {block.content}
              </Text>
            );
          case 'blockquote':
            return (
              <View key={i} style={[styles.blockquote, { borderLeftColor: theme.accent, backgroundColor: theme.surface }]}>
                <InlineSpans spans={block.spans} baseStyle={[baseText, styles.blockquoteText, { color: theme.textSecondary }]} />
              </View>
            );
          case 'codeblock':
            return (
              <View key={i} style={[styles.codeblock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.codeText, { color: theme.neon || theme.accent }]}>{block.content}</Text>
              </View>
            );
          case 'hr':
            return <View key={i} style={[styles.hr, { backgroundColor: theme.rule }]} />;
          case 'bullet':
            return (
              <View key={i} style={styles.listRow}>
                <Text style={[styles.bullet, { color: theme.accent }]}>•</Text>
                <InlineSpans spans={block.spans} baseStyle={[baseText, { flex: 1 }]} />
              </View>
            );
          case 'numbered':
            return (
              <View key={i} style={styles.listRow}>
                <Text style={[styles.numLabel, { color: theme.accent }]}>{block.num}.</Text>
                <InlineSpans spans={block.spans} baseStyle={[baseText, { flex: 1 }]} />
              </View>
            );
          case 'checklist':
            return <ChecklistItem key={i} block={block} theme={theme} index={i} onToggle={onChecklistToggle} />;
          case 'image':
            return (
              <View key={i} style={styles.imageWrap}>
                <Image source={{ uri: block.uri }} style={styles.image} resizeMode="cover" />
              </View>
            );
          case 'empty':
            return <View key={i} style={{ height: fontSize * 0.6 }} />;
          case 'paragraph':
          default:
            return (
              <InlineSpans key={i} spans={block.spans} baseStyle={[baseText, styles.paragraph]} />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
  fontSize: 22,
  fontWeight: '900',
  lineHeight: 30,
  marginTop: 18,
  marginBottom: 6,
  paddingBottom: 4,
  },
  h2: {
  fontSize: 18,
  fontWeight: '800',
  lineHeight: 25,
  marginTop: 16,
  marginBottom: 4,
  },
  h3: {
  fontSize: 15,
  fontWeight: '700',
  lineHeight: 21,
  letterSpacing: 0.2,
  marginTop: 12,
  marginBottom: 4,
  },
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    paddingVertical: 6,
    marginVertical: 10,
    borderRadius: 2,
  },
  blockquoteText: {
    fontStyle: 'italic',
  },
  codeblock: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginVertical: 10,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: 'rgba(128,128,128,0.15)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  hr: {
    height: 2,
    marginVertical: 16,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 18,
    lineHeight: 28,
    minWidth: 16,
  },
  numLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 28,
    minWidth: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
    paddingLeft: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  imageWrap: {
    marginVertical: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 220,
  },
  paragraph: {
    marginBottom: 4,
  },
});
