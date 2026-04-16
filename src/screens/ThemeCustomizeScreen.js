// src/screens/ThemeCustomizeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { getSetting, setSetting } from '../storage/db';

const ACCENT_PRESETS = [
  { name: 'Crimson',   hex: '#8b1a1a' },
  { name: 'Ink',       hex: '#2c1f0e' },
  { name: 'Gold',      hex: '#c9a84c' },
  { name: 'Cobalt',    hex: '#2563eb' },
  { name: 'Forest',    hex: '#2d6a4f' },
  { name: 'Rose',      hex: '#d4847a' },
  { name: 'Violet',    hex: '#7c3aed' },
  { name: 'Slate',     hex: '#475569' },
  { name: 'Amber',     hex: '#d97706' },
  { name: 'Neon',      hex: '#00f5ff' },
  { name: 'Magenta',   hex: '#e91e8c' },
  { name: 'Graphite',  hex: '#374151' },
];

const LINE_HEIGHTS = [
  { label: 'Compact',  value: 1.5 },
  { label: 'Normal',   value: 1.75 },
  { label: 'Relaxed',  value: 2.0 },
  { label: 'Airy',     value: 2.3 },
];

const FONT_SIZES = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export default function ThemeCustomizeScreen({ navigation }) {
  const { theme, themeId, refreshThemeSettings } = useTheme();
  const [accentOverride, setAccentOverride] = useState(null);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.75);
  const [customHex, setCustomHex] = useState('');
  const [showHexInput, setShowHexInput] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting(`accent_${themeId}`),
      getSetting('font_size'),
      getSetting('line_height'),
    ]).then(([accent, fs, lh]) => {
      if (accent) setAccentOverride(accent);
      if (fs) setFontSize(parseInt(fs, 10));
      if (lh) setLineHeight(parseFloat(lh));
    });
  }, [themeId]);

  const applyAccent = async (hex) => {
    setAccentOverride(hex);
    await setSetting(`accent_${themeId}`, hex);
    await refreshThemeSettings();
  };

  const applyFontSize = async (size) => {
    setFontSize(size);
    await setSetting('font_size', size);
    await refreshThemeSettings();
  };

  const applyLineHeight = async (lh) => {
    setLineHeight(lh);
    await setSetting('line_height', lh);
    await refreshThemeSettings();
  };

  const resetCustomizations = async () => {
    await setSetting(`accent_${themeId}`, '');
    setAccentOverride(null);

    await setSetting('font_size', 16);
    setFontSize(16);

    await setSetting('line_height', 1.75);
    setLineHeight(1.75);

    await refreshThemeSettings();
  };

  const effectiveAccent = accentOverride || theme.accent;

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Customise Theme</Text>
        <TouchableOpacity onPress={resetCustomizations} style={{ padding: 4 }}>
          <Ionicons name="refresh-outline" size={20} color={theme.headerText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

        {/* Live Preview Card */}
        <View style={[s.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={s.previewLabel}>Preview</Text>
          <View style={[s.previewRule, { backgroundColor: effectiveAccent }]} />
          <Text style={[s.previewHeadline, { color: theme.text, fontSize: fontSize + 8 }]}>
            Your Chronicle
          </Text>
          <Text style={[s.previewBody, { color: theme.textSecondary, fontSize, lineHeight: fontSize * lineHeight }]}>
            This is how your posts will look with the current customisation applied. The accent colour, font size and line spacing all update live.
          </Text>
          <View style={[s.previewTag, { borderColor: effectiveAccent }]}>
            <Text style={[s.previewTagText, { color: effectiveAccent }]}>Journal</Text>
          </View>
        </View>

        {/* Accent colour */}
        <Text style={s.sectionTitle}>Accent Colour</Text>
        <View style={s.colorGrid}>
          {ACCENT_PRESETS.map(p => (
            <TouchableOpacity
              key={p.hex}
              style={[s.colorSwatch, { backgroundColor: p.hex },
                effectiveAccent === p.hex && s.swatchActive]}
              onPress={() => applyAccent(p.hex)}
              activeOpacity={0.8}
            >
              {effectiveAccent === p.hex && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.colorSwatch, s.hexSwatch, { borderColor: theme.border }]}
            onPress={() => setShowHexInput(!showHexInput)}
          >
            <Text style={[s.hexSwatchText, { color: theme.text }]}>HEX</Text>
          </TouchableOpacity>
        </View>

        {showHexInput && (
          <View style={[s.hexInputRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[s.hexHash, { color: theme.text }]}>#</Text>
            <TextInput
              style={[s.hexInput, { color: theme.text }]}
              placeholder="e.g. ff6600"
              placeholderTextColor={theme.textSecondary}
              value={customHex}
              onChangeText={setCustomHex}
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[s.hexApply, { backgroundColor: theme.accent }]}
              onPress={() => {
                const clean = customHex.replace('#', '');
                if (/^[0-9a-fA-F]{6}$/.test(clean)) {
                  applyAccent(`#${clean}`);
                  setShowHexInput(false);
                }
              }}
            >
              <Text style={[s.hexApplyText, { color: theme.accentText }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Font size */}
        <Text style={s.sectionTitle}>Body Font Size</Text>
        <View style={s.sizeRow}>
          {FONT_SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[s.sizeChip, { borderColor: theme.border, backgroundColor: theme.surface },
                fontSize === size && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => applyFontSize(size)}
            >
              <Text style={[s.sizeChipText, { color: fontSize === size ? theme.accentText : theme.text }]}>
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Line height */}
        <Text style={s.sectionTitle}>Line Spacing</Text>
        <View style={s.lineRow}>
          {LINE_HEIGHTS.map(lh => (
            <TouchableOpacity
              key={lh.value}
              style={[s.lineChip, { borderColor: theme.border, backgroundColor: theme.surface },
                lineHeight === lh.value && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              onPress={() => applyLineHeight(lh.value)}
            >
              <Text style={[s.lineChipText, { color: lineHeight === lh.value ? theme.accentText : theme.text }]}>
                {lh.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reset */}
        <TouchableOpacity style={[s.resetBtn, { borderColor: theme.border }]} onPress={resetCustomizations}>
          <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
          <Text style={[s.resetText, { color: theme.textSecondary }]}>Reset to theme defaults</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.headerBg, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 2, borderBottomColor: theme.rule,
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    previewCard: {
      borderWidth: 1, borderRadius: 4, padding: 18, marginBottom: 28,
    },
    previewLabel: {
      fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase',
      color: theme.textSecondary, marginBottom: 10,
    },
    previewRule: { height: 3, marginBottom: 10, borderRadius: 1 },
    previewHeadline: { fontWeight: '900', fontFamily: 'serif', lineHeight: 38, marginBottom: 8 },
    previewBody: { marginBottom: 12 },
    previewTag: { borderWidth: 1, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2 },
    previewTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase',
      color: theme.textSecondary, marginBottom: 12, marginTop: 4,
    },
    colorGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
    },
    colorSwatch: {
      width: 42, height: 42, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center',
    },
    swatchActive: {
      borderWidth: 3, borderColor: '#fff',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    hexSwatch: {
      backgroundColor: 'transparent',
      borderWidth: 1.5, borderStyle: 'dashed',
    },
    hexSwatchText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    hexInputRow: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1,
      borderRadius: 4, paddingHorizontal: 12, marginBottom: 20, height: 44,
    },
    hexHash: { fontSize: 16, fontWeight: '700', marginRight: 4 },
    hexInput: { flex: 1, fontSize: 15, letterSpacing: 1 },
    hexApply: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4,
    },
    hexApplyText: { fontSize: 12, fontWeight: '700' },
    sizeRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24,
    },
    sizeChip: {
      width: 46, height: 36, borderWidth: 1, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    sizeChipText: { fontSize: 13, fontWeight: '700' },
    lineRow: {
      flexDirection: 'row', gap: 10, marginBottom: 28,
    },
    lineChip: {
      flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 20,
      alignItems: 'center',
    },
    lineChipText: { fontSize: 12, fontWeight: '700' },
    resetBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderWidth: 1, paddingVertical: 12, borderRadius: 20,
    },
    resetText: { fontSize: 13 },
  });
}