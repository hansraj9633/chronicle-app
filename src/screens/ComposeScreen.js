// src/screens/ComposeScreen.js  — Phase 2: Rich Editor
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../themes/ThemeContext';
import { createPost, updatePost, getPost, getCategories } from '../storage/db';
import FormatToolbar from '../components/FormatToolbar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  wrapSelection, insertBlock, toggleLinePrefix, wordCount, readTime,
} from '../editor/richText';

const MAX_UNDO = 50;

export default function ComposeScreen({ navigation, route }) {
  const { theme } = useTheme();
  const editId = route.params?.id || null;

  const [title, setTitle] = useState('');
  const [deck, setDeck] = useState('');
  const [body, setBody] = useState('');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('Journal');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('published');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const bodyRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const lastBody = useRef('');
  const latestSelectionRef = useRef({ start: 0, end: 0 });

  const pushUndo = useCallback((text) => {
    if (text === lastBody.current) return;
    undoStack.current = [...undoStack.current.slice(-MAX_UNDO), text];
    redoStack.current = [];
    lastBody.current = text;
  }, []);

  const applyAutoContinueOnEnter = (prevText, nextText) => {
    const prevSel = latestSelectionRef.current;
    const insertedChars = nextText.length - prevText.length;

    // Only react to a single Enter key press with no selection replacement
    if (
      insertedChars !== 1 ||
      prevSel.start !== prevSel.end ||
      nextText[prevSel.start] !== '\n'
    ) {
      return null;
    }

    const cursorPos = prevSel.start;
    const lineStart = prevText.lastIndexOf('\n', cursorPos - 1) + 1;
    const line = prevText.slice(lineStart, cursorPos);

    let prefix = '';

    // Checklist: - [ ] or - [x]
    const checklistMatch = line.match(/^- \[(?: |x|X)\]\s/);
    if (checklistMatch) {
      prefix = '- [ ] ';
    }
    // Numbered list: 1. 2. 3. ...
    else {
      const numberedMatch = line.match(/^(\d+)\.\s/);
      if (numberedMatch) {
        prefix = `${parseInt(numberedMatch[1], 10) + 1}. `;
      } else if (line.startsWith('- ')) {
        prefix = '- ';
      } else if (line.startsWith('> ')) {
        prefix = '> ';
      }
    }

    if (!prefix) {
      return null;
    }

    const finalText =
      nextText.slice(0, cursorPos + 1) + prefix + nextText.slice(cursorPos + 1);

    const nextCursor = cursorPos + 1 + prefix.length;

    return {
      text: finalText,
      selection: { start: nextCursor, end: nextCursor },
    };
  };

  // Stable helper: converts visible [Image attached] back into actual markdown
  const normalizeDisplayToBody = useCallback((text, originalBody) => {
    const imageRegex = /!\[[^\]]*]\((file:\/\/[^\s)]+)\)/g;
    const images = originalBody.match(imageRegex) || [];

    let result = text;

    images.forEach((img) => {
      result = result.replace('[Image attached]', img);
    });

    return result;
  }, []);

  const handleBodyChange = (text) => {
    const normalizedText = normalizeDisplayToBody(text, body);
    const auto = applyAutoContinueOnEnter(body, normalizedText);

    pushUndo(body);

    if (auto) {
      setBody(auto.text);
      setSelection(auto.selection);
      latestSelectionRef.current = auto.selection;
      return;
    }

    setBody(normalizedText);
  };

  useEffect(() => {
    let active = true;

    const pickDefaultCategory = (items) => {
      if (items.includes('Journal')) return 'Journal';
      return items[0] || 'Journal';
    };

    const loadComposeData = async () => {
      const [savedCategories, post] = await Promise.all([
        getCategories(),
        editId ? getPost(editId) : Promise.resolve(null),
      ]);
      if (!active) return;

      const names = savedCategories.map(item => item.name);
      setCategories(names);

      if (post) {
        setTitle(post.title);
        setDeck(post.deck || '');
        setBody(post.body);
        setCategory(names.includes(post.category) ? post.category : pickDefaultCategory(names));
        setTags(post.tags || '');
        setStatus(post.status);
        lastBody.current = post.body;

        const displayText = (post.body || '').replace(
          /!\[[^\]]*]\((file:\/\/[^\s)]+)\)/g,
          '[Image attached]'
        );

        const endPos = displayText.length;
        const initialSelection = { start: endPos, end: endPos };
        setSelection(initialSelection);
        latestSelectionRef.current = initialSelection;
      } else {
        setCategory(current => (names.includes(current) ? current : pickDefaultCategory(names)));
      }
    };

    loadComposeData();
    return () => { active = false; };
  }, [editId]);

  const wc = wordCount(body);
  const rt = readTime(wc);

  // WRITE mode display only
  const displayBody = useMemo(() => {
    return body.replace(
      /!\[[^\]]*]\((file:\/\/[^\s)]+)\)/g,
      '[Image attached]'
    );
  }, [body]);

  const handleSave = async (saveStatus = status) => {
    if (!title.trim()) {
      Alert.alert('Missing Headline', 'Add a title for your post.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Missing Body', 'Your post needs some content.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        deck: deck.trim(),
        body: body.trim(),
        category,
        tags: tags.trim(),
        status: saveStatus,
      };

      editId ? await updatePost(editId, data) : await createPost(data);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!title && !body) {
      navigation.goBack();
      return;
    }

    Alert.alert('Discard changes?', 'Unsaved text will be lost.', [
      { text: 'Keep Writing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const focusBodyEditor = () => {
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
    });
  };
  
  const saveImagePermanently = async (sourceUri) => {
    const imageDir = `${FileSystem.documentDirectory}chronicle-images/`;

    const dirInfo = await FileSystem.getInfoAsync(imageDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
    }

    const extensionMatch = sourceUri.match(/\.(jpg|jpeg|png|webp|gif)$/i);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '.jpg';

    const fileName = `img_${Date.now()}${extension}`;
    const destinationUri = `${imageDir}${fileName}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    return destinationUri;
  };

  const handleAction = async (action) => {
    const { start, end } = latestSelectionRef.current;

    const applyText = (newText, nextSelection = null) => {
      pushUndo(body);
      setBody(newText);

      let finalSelection = nextSelection;
      if (!finalSelection) {
        const pos = newText.length;
        finalSelection = { start: pos, end: pos };
      }

      setSelection(finalSelection);
      latestSelectionRef.current = finalSelection;

      if (!previewMode) {
        focusBodyEditor();
      }
    };

    const insertImageMarkdown = (uri) => {
      const altText = 'Selected image';
      const markdown = `![${altText}](${uri})`;

      // Convert display selection position to real body position
      const visibleBefore = displayBody.slice(0, start);
      const visibleSelected = displayBody.slice(start, end);

      const realStart = normalizeDisplayToBody(visibleBefore, body).length;
      const realEnd = realStart + normalizeDisplayToBody(visibleSelected, body.slice(realStart)).length;

      const before = body.slice(0, realStart);
      const after = body.slice(realEnd);

      const needsLeadingNewline =
        before.length > 0 && !before.endsWith('\n');

      const needsTrailingNewline =
        after.length > 0 && !after.startsWith('\n');

      const insertText =
        `${needsLeadingNewline ? '\n' : ''}${markdown}${needsTrailingNewline ? '\n' : ''}`;

      const newText = before + insertText + after;

      // Cursor should move in visible editor length, not markdown length
      const visibleInsertText =
        `${needsLeadingNewline ? '\n' : ''}[Image attached]${needsTrailingNewline ? '\n' : ''}`;

      const nextPos = start + visibleInsertText.length;

      applyText(newText, { start: nextPos, end: nextPos });
    };

    switch (action) {
      case 'bold': {
        const r = wrapSelection(body, start, end, '**');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'italic': {
        const r = wrapSelection(body, start, end, '_');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'underline': {
        const r = wrapSelection(body, start, end, '++');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'code': {
        const r = wrapSelection(body, start, end, '`');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'h1': {
        const r = insertBlock(body, start, '# ');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'h2': {
        const r = insertBlock(body, start, '## ');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'h3': {
        const r = insertBlock(body, start, '### ');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'hr': {
        const r = insertBlock(body, start, '---');
        applyText(r.text, r.selection || (typeof r.cursor === 'number' ? { start: r.cursor, end: r.cursor } : null));
        break;
      }
      case 'bullet': {
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const prefix = '- ';
        const lineHasPrefix = body.slice(lineStart, lineStart + prefix.length) === prefix;

        const newText = toggleLinePrefix(body, start, prefix);

        let nextPos;
        if (lineHasPrefix) {
          nextPos = Math.max(lineStart, start - prefix.length);
        } else {
          nextPos = start + prefix.length;
        }

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'numbered': {
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const prefix = '1. ';
        const lineHasPrefix = body.slice(lineStart, lineStart + prefix.length) === prefix;

        const newText = toggleLinePrefix(body, start, prefix);

        let nextPos;
        if (lineHasPrefix) {
          nextPos = Math.max(lineStart, start - prefix.length);
        } else {
          nextPos = start + prefix.length;
        }

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'checklist': {
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const prefix = '- [ ] ';
        const lineHasPrefix = body.slice(lineStart, lineStart + prefix.length) === prefix;

        const newText = toggleLinePrefix(body, start, prefix);

        let nextPos;
        if (lineHasPrefix) {
          nextPos = Math.max(lineStart, start - prefix.length);
        } else {
          nextPos = start + prefix.length;
        }

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'blockquote': {
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const prefix = '> ';
        const lineHasPrefix = body.slice(lineStart, lineStart + prefix.length) === prefix;

        const newText = toggleLinePrefix(body, start, prefix);

        let nextPos;
        if (lineHasPrefix) {
          nextPos = Math.max(lineStart, start - prefix.length);
        } else {
          nextPos = start + prefix.length;
        }

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'codeblock': {
        const block = '```\ncode\n```';
        const before = body.slice(0, start);
        const after = body.slice(start);

        const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
        const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');

        const insertText =
          `${needsLeadingNewline ? '\n' : ''}${block}${needsTrailingNewline ? '\n' : ''}`;

        const newText = before + insertText + after;

        const blockStart = start + (needsLeadingNewline ? 1 : 0);
        const codeStart = blockStart + 4;
        const codeEnd = codeStart + 4;

        applyText(newText, { start: codeStart, end: codeEnd });
        break;
      }
      case 'paragraph': {
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const nextNewline = body.indexOf('\n', start);
        const lineEnd = nextNewline === -1 ? body.length : nextNewline;

        const line = body.slice(lineStart, lineEnd);

        const cleanedLine = line.replace(
          /^(?:#{1,3}\s+|>\s+|- \[ \]\s+|- \[x\]\s+|- \s+|\d+\.\s+)/i,
          ''
        );

        if (cleanedLine === line) {
          if (!previewMode) focusBodyEditor();
          break;
        }

        const newText = body.slice(0, lineStart) + cleanedLine + body.slice(lineEnd);

        const removedChars = line.length - cleanedLine.length;
        const nextPos = Math.max(lineStart, start - removedChars);

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'image': {
        try {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (!permission.granted) {
            Alert.alert(
              'Permission Needed',
              'Allow photo library access to insert images.'
            );
            break;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.9,
          });

          if (result.canceled || !result.assets?.length) {
            if (!previewMode) focusBodyEditor();
            break;
          }

          const pickedUri = result.assets[0].uri;
          const permanentUri = await saveImagePermanently(pickedUri);

          insertImageMarkdown(permanentUri);
        } catch {
          Alert.alert('Image Error', 'Could not pick or save image.');
        }
        break;
      }
      // case 'voice': {
      //   Alert.alert(
      //     'Voice to Text',
      //     'Tap the microphone on your keyboard for voice input.\n\nDedicated voice support comes in Phase 3.'
      //   );
      //   break;
      // }
      case 'undo': {
        if (!undoStack.current.length) return;
        const prev = undoStack.current.pop();
        redoStack.current.push(body);
        lastBody.current = prev;
        setBody(prev);

        const prevDisplay = prev.replace(
          /!\[[^\]]*]\((file:\/\/[^\s)]+)\)/g,
          '[Image attached]'
        );

        const nextSelection = { start: prevDisplay.length, end: prevDisplay.length };
        setSelection(nextSelection);
        latestSelectionRef.current = nextSelection;

        if (!previewMode) focusBodyEditor();
        break;
      }
      case 'redo': {
        if (!redoStack.current.length) return;
        const next = redoStack.current.pop();
        undoStack.current.push(body);
        lastBody.current = next;
        setBody(next);

        const nextDisplay = next.replace(
          /!\[[^\]]*]\((file:\/\/[^\s)]+)\)/g,
          '[Image attached]'
        );

        const nextSelection = { start: nextDisplay.length, end: nextDisplay.length };
        setSelection(nextSelection);
        latestSelectionRef.current = nextSelection;

        if (!previewMode) focusBodyEditor();
        break;
      }
      case 'clear': {
        const selected = body.slice(start, end);

        // 1) If text is selected -> clear inline formatting only from selection
        if (selected) {
          const cleaned = selected.replace(/\*\*|__|\+\+|~~|`/g, '');
          const newText = body.slice(0, start) + cleaned + body.slice(end);
          const nextSelection = {
            start,
            end: start + cleaned.length,
          };
          applyText(newText, nextSelection);
          break;
        }

        // 2) If no selection -> clear formatting from current line
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        const nextNewline = body.indexOf('\n', start);
        const lineEnd = nextNewline === -1 ? body.length : nextNewline;

        const line = body.slice(lineStart, lineEnd);

        // Remove block-level prefix first
        const withoutBlock = line.replace(
          /^(?:#{1,3}\s+|>\s+|- \[ \]\s+|- \[x\]\s+|- \s+|\d+\.\s+)/i,
          ''
        );

        // Then remove inline markers from the same line
        const cleanedLine = withoutBlock.replace(/\*\*|__|\+\+|~~|`/g, '');

        if (cleanedLine === line) {
          if (!previewMode) focusBodyEditor();
          break;
        }

        const newText = body.slice(0, lineStart) + cleanedLine + body.slice(lineEnd);

        const removedChars = line.length - cleanedLine.length;
        const nextPos = Math.max(lineStart, start - removedChars);

        applyText(newText, { start: nextPos, end: nextPos });
        break;
      }
      case 'preview':
        setPreviewMode(p => !p);
        break;
      case 'fullscreen':
        setFullscreen(p => !p);
        break;
      default:
        break;
    }
  };

  const s = makeStyles(theme);

  const renderEditorModeToggle = () => (
    <View style={s.modeWrap}>
      <View style={s.modeToggle}>
        <TouchableOpacity
          style={[s.modeBtn, !previewMode && s.modeBtnActive]}
          onPress={() => setPreviewMode(false)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={!previewMode ? theme.accentText : theme.textSecondary}
          />
          <Text style={[s.modeBtnText, !previewMode && s.modeBtnTextActive]}>
            Write
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.modeBtn, previewMode && s.modeBtnActive]}
          onPress={() => setPreviewMode(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="eye-outline"
            size={16}
            color={previewMode ? theme.accentText : theme.textSecondary}
          />
          <Text style={[s.modeBtnText, previewMode && s.modeBtnTextActive]}>
            Preview
          </Text>
        </TouchableOpacity>
      </View>

      {!previewMode && (
        <Text style={s.modeHelper}>
          Formatting appears in Preview / published view
        </Text>
      )}
    </View>
  );

  const renderFormFields = () => (
    <>
      <View style={s.catRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catScrollContent}
          keyboardShouldPersistTaps="always"
        >
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.catChip, category === c && s.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[s.catChipText, category === c && s.catChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={s.form}>
        <TextInput
          style={s.titleInput}
          placeholder="Headline…"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
          multiline
        />

        <TextInput
          style={s.deckInput}
          placeholder="Deck / subheadline (optional)…"
          placeholderTextColor={theme.textSecondary}
          value={deck}
          onChangeText={setDeck}
        />

        <View style={s.divider} />

        {renderEditorModeToggle()}

        {previewMode ? (
          <View style={s.previewCard}>
            {body.trim()
              ? <MarkdownRenderer text={body} fontSize={16} />
              : <Text style={[s.previewEmpty, { color: theme.textSecondary }]}>Nothing to preview yet…</Text>}
          </View>
        ) : (
          <View style={s.writeCard}>
            <TextInput
              ref={bodyRef}
              style={s.bodyInput}
              placeholder="Begin your dispatch…"
              placeholderTextColor={theme.textSecondary}
              value={displayBody}
              onChangeText={handleBodyChange}
              onSelectionChange={e => {
                const next = e.nativeEvent.selection;
                setSelection(next);
                latestSelectionRef.current = next;
              }}
              selection={selection}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              autoCorrect={false}
              autoCapitalize="sentences"
            />
          </View>
        )}
      </View>
    </>
  );

  const renderBottomStats = () => (
    <View style={s.footer}>
      <TextInput
        style={s.tagsInput}
        placeholder="Tags (comma separated)…"
        placeholderTextColor={theme.textSecondary}
        value={tags}
        onChangeText={setTags}
      />
      <Text style={s.wordCount}>{wc}w · {rt}m</Text>
    </View>
  );

  // ── Fullscreen modal ─────────────────────────────────────
  if (fullscreen) {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setFullscreen(false)}>
        <SafeAreaView style={[s.safe, { flex: 1 }]} edges={['top', 'bottom']}>
          <View style={s.toolbar}>
            <TouchableOpacity onPress={() => setFullscreen(false)} style={s.toolbarBtn}>
              <Ionicons name="contract-outline" size={22} color={theme.headerText} />
            </TouchableOpacity>

            <Text style={s.toolbarTitle}>Fullscreen Editor</Text>

            <TouchableOpacity
              style={s.publishBtn}
              onPress={() => {
                setFullscreen(false);
                handleSave();
              }}
            >
              <Text style={s.publishBtnText}>Save & Close</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {renderFormFields()}
            </ScrollView>

            {renderBottomStats()}

            {!previewMode && <FormatToolbar onAction={handleAction} />}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ── Normal view ──────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={s.toolbar}>
          <TouchableOpacity onPress={handleDiscard} style={s.toolbarBtn}>
            <Ionicons name="close" size={24} color={theme.headerText} />
          </TouchableOpacity>

          <Text style={s.toolbarTitle}>{editId ? 'Edit Entry' : 'New Entry'}</Text>

          <View style={s.toolbarRight}>
            <TouchableOpacity
              style={s.draftBtn}
              onPress={() => handleSave('draft')}
              disabled={saving}
            >
              <Text style={s.draftBtnText}>Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.publishBtn}
              onPress={() => handleSave('published')}
              disabled={saving}
            >
              <Text style={s.publishBtnText}>{saving ? '…' : editId ? 'Update' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          {renderFormFields()}
        </ScrollView>

        {renderBottomStats()}

        {!previewMode && <FormatToolbar onAction={handleAction} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.headerBg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    toolbarBtn: {
      padding: 4,
    },

    toolbarTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.headerText,
    },

    toolbarRight: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },

    draftBtn: {
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },

    draftBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },

    publishBtn: {
      backgroundColor: theme.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },

    publishBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.accentText,
    },

    scroll: {
      flex: 1,
    },

    catRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    catScrollContent: {
      paddingHorizontal: 16,
      gap: 8,
    },

    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },

    catChipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },

    catChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    catChipTextActive: {
      color: theme.accentText,
    },

    form: {
      padding: 18,
    },

    titleInput: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.text,
      fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif',
      lineHeight: 34,
      marginBottom: 4,
      minHeight: 40,
    },

    deckInput: {
      fontSize: 16,
      fontStyle: 'italic',
      color: theme.textSecondary,
      marginBottom: 4,
      lineHeight: 24,
    },

    divider: {
      height: 2,
      backgroundColor: theme.rule,
      marginBottom: 5,
    },

    modeWrap: {
      marginBottom: 5,
    },
    
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 1,
      marginBottom: 1,
    },

    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 5,
      borderRadius: 20,
    },

    modeBtnActive: {
      backgroundColor: theme.accent,
    },

    modeBtnText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },

    modeBtnTextActive: {
      color: theme.accentText,
    },

    modeHelper: {
      fontSize: 11,
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingHorizontal: 4,
      textAlign:'center',
    },

    writeCard: {
      minHeight: 420,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 10,
    },

    previewCard: {
      minHeight: 420,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 10,
    },

    bodyInput: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 28,
      minHeight: 390,
      fontFamily: theme.bodyFont === 'monospace' ? 'monospace' : undefined,
    },

    previewEmpty: {
      fontStyle: 'italic',
      marginTop: 20,
      textAlign: 'center',
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 1,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },

    tagsInput: {
      flex: 1,
      fontSize: 12,
      color: theme.textSecondary,
      paddingVertical: 4,
    },

    wordCount: {
      fontSize: 11,
      color: theme.textSecondary,
      letterSpacing: 0.5,
      fontWeight: '600',
    },
  });
}