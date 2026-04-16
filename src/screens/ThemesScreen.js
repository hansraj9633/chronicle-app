// src/screens/ThemesScreen.js
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { THEME_LIST } from '../themes/themes';

export default function ThemesScreen({ navigation }) {
  const { theme, themeId, changeTheme } = useTheme();
  const handleCustomize = () => navigation.navigate('ThemeCustomize');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.rule }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Choose Theme</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Each theme transforms the entire app — typography, colors, layout and mood.
        </Text>

        <View style={styles.grid}>
          {THEME_LIST.map(t => {
            const active = t.id === themeId;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.themeCard,
                  { backgroundColor: t.card, borderColor: active ? t.accent : t.border },
                  active && { borderWidth: 2.5 },
                ]}
                onPress={() => changeTheme(t.id)}
                activeOpacity={0.8}
              >
                {/* Mini preview */}
                <View style={[styles.preview, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
                  <View style={[styles.previewHeader, { backgroundColor: t.headerBg }]} />
                  <View style={[styles.previewLine, { backgroundColor: t.text, width: '80%', opacity: 0.8 }]} />
                  <View style={[styles.previewLine, { backgroundColor: t.text, width: '60%', opacity: 0.5 }]} />
                  <View style={[styles.previewLine, { backgroundColor: t.text, width: '70%', opacity: 0.3 }]} />
                  <View style={[styles.previewDot, { backgroundColor: t.accent }]} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardEmoji}>{t.emoji}</Text>
                    <Text style={[styles.cardName, { color: t.text }]}>{t.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={t.accent} />}
                  </View>
                  <Text style={[styles.cardDesc, { color: t.textSecondary }]}>{t.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.customizeBtn, { backgroundColor: theme.accent }]}
          onPress={handleCustomize}
        >
          <Ionicons name="brush-outline" size={18} color={theme.accentText} />
          <Text style={[styles.customizeBtnText, { color: theme.accentText }]}>
            Customise Current Theme
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '48%',
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  preview: {
    height: 80,
    padding: 8,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
    gap: 4,
  },
  previewHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 14,
  },
  previewLine: {
    height: 5,
    borderRadius: 2,
  },
  previewDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cardBody: { padding: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  cardEmoji: { fontSize: 14 },
  cardName: { flex: 1, fontSize: 13, fontWeight: '800' },
  cardDesc: { fontSize: 11, lineHeight: 16 },
  customizeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 20, marginTop: 8,
  },
  customizeBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
