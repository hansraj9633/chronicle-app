// src/screens/StatsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../themes/ThemeContext';
import { getStats, getAllPosts } from '../storage/db';

export default function StatsScreen() {
  const { theme } = useTheme();
  const [stats, setStats] = useState({ posts: 0, drafts: 0, words: 0, streak: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  useFocusEffect(useCallback(() => {
    getStats().then(setStats);
    getAllPosts().then(posts => {
      const cats = {};
      posts.forEach(p => {
        if (p.status === 'published') cats[p.category] = (cats[p.category] || 0) + 1;
      });
      setCategoryBreakdown(Object.entries(cats).sort((a, b) => b[1] - a[1]));
    });
  }, []));

  const avgWords = stats.posts > 0 ? Math.round(stats.words / stats.posts) : 0;

  const s = makeStyles(theme);

  const StatBox = ({ label, value, sub }) => (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Chronicle Stats</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {/* Streak banner */}
        <View style={[s.streakBanner, { backgroundColor: theme.accent }]}>
          <Text style={[s.streakNum, { color: theme.accentText }]}>{stats.streak}</Text>
          <Text style={[s.streakLabel, { color: theme.accentText }]}>Day Writing Streak 🔥</Text>
          <Text style={[s.streakSub, { color: theme.accentText, opacity: 0.75 }]}>
            {stats.streak === 0 ? 'Write today to start your streak' : 'Keep going!'}
          </Text>
        </View>

        {/* Stat grid */}
        <View style={s.statGrid}>
          <StatBox label="Published" value={stats.posts} />
          <StatBox label="Drafts" value={stats.drafts} />
          <StatBox label="Total Words" value={stats.words.toLocaleString()} />
          <StatBox label="Avg. Per Post" value={avgWords} sub="words" />
        </View>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>By Category</Text>
            {categoryBreakdown.map(([cat, count]) => {
              const pct = stats.posts > 0 ? Math.round((count / stats.posts) * 100) : 0;
              return (
                <View key={cat} style={s.catRow}>
                  <Text style={s.catName}>{cat}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%`, backgroundColor: theme.accent }]} />
                  </View>
                  <Text style={s.catCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {stats.posts === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyText}>Your stats will appear here once you start writing.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      backgroundColor: theme.headerBg,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: theme.rule,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.headerText,
      fontFamily: 'serif',
    },
    streakBanner: {
      padding: 22,
      alignItems: 'center',
      marginBottom: 18,
      borderRadius: 20,
    },
    streakNum: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
    streakLabel: { fontSize: 16, fontWeight: '700', marginTop: 4 },
    streakSub: { fontSize: 12, marginTop: 4 },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    statBox: {
      width: '47%',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      alignItems: 'center',
      borderRadius:20,
    },
    statValue: { fontSize: 32, fontWeight: '900', color: theme.text, fontFamily: 'serif' },
    statLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
    statSub: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
    section: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      borderRadius:20,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      marginBottom: 14,
    },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    catName: { width: 70, fontSize: 13, fontWeight: '600', color: theme.text },
    barTrack: { flex: 1, height: 8, backgroundColor: theme.surface, borderRadius: 20, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    catCount: { width: 24, textAlign: 'right', fontSize: 13, fontWeight: '700', color: theme.text },
    emptyState: { alignItems: 'center', paddingTop: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  });
}
