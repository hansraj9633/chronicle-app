// src/screens/ArchiveScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { getPostsByMonth } from '../storage/db';

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ArchiveScreen({ navigation }) {
  const { theme } = useTheme();
  const [sections, setSections] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  useFocusEffect(useCallback(() => {
    getPostsByMonth().then(groups => {
      setSections(groups.map(g => ({
        title: g.label,
        key: g.key,
        count: g.posts.length,
        data: g.posts,
      })));
    });
  }, []));

  const toggleCollapse = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const s = makeStyles(theme);

  const renderSectionHeader = ({ section }) => (
    <TouchableOpacity
      style={s.sectionHeader}
      onPress={() => toggleCollapse(section.key)}
      activeOpacity={0.75}
    >
      <View style={[s.monthDot, { backgroundColor: theme.accent }]} />
      <Text style={s.monthLabel}>{section.title}</Text>
      <Text style={s.monthCount}>{section.count} {section.count === 1 ? 'entry' : 'entries'}</Text>
      <Ionicons
        name={collapsed[section.key] ? 'chevron-down' : 'chevron-up'}
        size={16}
        color={theme.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderItem = ({ item, section }) => {
    if (collapsed[section.key]) return null;
    return (
      <TouchableOpacity
        style={s.postRow}
        onPress={() => navigation.navigate('Post', { id: item.id })}
        activeOpacity={0.75}
      >
        <View style={s.postRowLeft}>
          <Text style={s.postDate}>{formatShortDate(item.created_at)}</Text>
          <View style={[s.dateLine, { backgroundColor: theme.border }]} />
        </View>
        <View style={s.postRowRight}>
          <View style={s.postRowTop}>
            <View style={[s.catDot, { backgroundColor: theme.accent }]} />
            <Text style={s.catLabel}>{item.category}</Text>
            {item.pinned === 1 && (
              <Ionicons name="bookmark" size={11} color={theme.accent} />
            )}
          </View>
          <Text style={s.postTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.postMeta}>{item.word_count}w · {item.read_time}m read</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Archive</Text>
        <TouchableOpacity
          onPress={() => {
            const allKeys = sections.map(s => s.key);
            const anyOpen = allKeys.some(k => !collapsed[k]);
            const next = {};
            allKeys.forEach(k => { next[k] = anyOpen; });
            setCollapsed(next);
          }}
          style={{ padding: 4 }}
        >
          <Ionicons name="layers-outline" size={20} color={theme.headerText} />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📅</Text>
          <Text style={s.emptyTitle}>No archive yet</Text>
          <Text style={s.emptyBody}>Published posts will appear here, organised by month.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={() => (
            <View style={s.statsBar}>
              <Text style={s.statsText}>
                {sections.reduce((a, s) => a + s.count, 0)} total entries
                across {sections.length} {sections.length === 1 ? 'month' : 'months'}
              </Text>
            </View>
          )}
        />
      )}
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
    headerTitle: {
      fontSize: 20, fontWeight: '900', color: theme.headerText,
      fontFamily: 'serif', letterSpacing: -0.3,
    },
    statsBar: {
      paddingHorizontal: 18, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    statsText: {
      fontSize: 11, color: theme.textSecondary,
      letterSpacing: 1, textTransform: 'uppercase',
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 18, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      gap: 10,
    },
    monthDot: { width: 8, height: 8, borderRadius: 4 },
    monthLabel: {
      flex: 1, fontSize: 14, fontWeight: '800',
      color: theme.text, letterSpacing: 0.3,
      fontFamily: 'serif',
    },
    monthCount: { fontSize: 11, color: theme.textSecondary, marginRight: 4 },
    postRow: {
      flexDirection: 'row',
      paddingLeft: 18, paddingRight: 18, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.card,
      gap: 14,
    },
    postRowLeft: { alignItems: 'center', width: 44 },
    postDate: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textAlign: 'center' },
    dateLine: { flex: 1, width: 1, marginTop: 6 },
    postRowRight: { flex: 1 },
    postRowTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    catDot: { width: 6, height: 6, borderRadius: 3 },
    catLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.textSecondary },
    postTitle: { fontSize: 15, fontWeight: '700', color: theme.text, lineHeight: 22, fontFamily: 'serif' },
    postMeta: { fontSize: 11, color: theme.textSecondary, marginTop: 4 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { fontSize: 52, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8, fontFamily: 'serif' },
    emptyBody: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  });
}
