// src/screens/HomeScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../themes/ThemeContext';
import { getAllPosts, getCategories, togglePin } from '../storage/db';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PostCard({ post, theme, onPress, onPin, index }) {
  const isFeature = index === 0;
  const isPinned = post.pinned === 1;

  if (isFeature) {
    return (
      <TouchableOpacity
        style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.rule, borderBottomWidth: 3 }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.featureTop}>
          <View style={[styles.categoryBadge, { borderColor: theme.accent }]}>
            <Text style={[styles.categoryText, { color: theme.accent }]}>{post.category}</Text>
          </View>
          {isPinned && <Ionicons name="bookmark" size={14} color={theme.accent} />}
        </View>
        <Text style={[styles.featureHeadline, { color: theme.text, fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' }]} numberOfLines={3}>
          {post.title}
        </Text>
        {post.deck ? (
          <Text style={[styles.featureDeck, { color: theme.textSecondary }]} numberOfLines={2}>
            {post.deck}
          </Text>
        ) : null}
        <Text style={[styles.featurePreview, { color: theme.textSecondary }]} numberOfLines={3}>
          {post.body}
        </Text>
        <View style={styles.postMeta}>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{formatDate(post.created_at)}</Text>
          <Text style={[styles.metaDot, { color: theme.border }]}>·</Text>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{post.word_count} words</Text>
          <Text style={[styles.metaDot, { color: theme.border }]}>·</Text>
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>{post.read_time} min read</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onPin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isPinned ? 'bookmark' : 'bookmark-outline'} size={16} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.listCardLeft}>
        <View style={styles.listCardTop}>
          <Text style={[styles.categorySmall, { color: theme.accent }]}>{post.category}</Text>
          {isPinned && <Ionicons name="bookmark" size={11} color={theme.accent} style={{ marginLeft: 4 }} />}
        </View>
        <Text style={[styles.listHeadline, { color: theme.text, fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' }]} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={[styles.listMeta, { color: theme.textSecondary }]}>
          {formatDate(post.created_at)} · {post.word_count}w
        </Text>
      </View>
      <TouchableOpacity onPress={onPin} style={styles.pinBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name={isPinned ? 'bookmark' : 'bookmark-outline'} size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    const [data, savedCategories] = await Promise.all([
      getAllPosts(filter, search),
      getCategories(),
    ]);
    setPosts(data);
    setCategories(savedCategories.map(item => item.name));
    if (filter !== 'All' && !savedCategories.some(item => item.name === filter)) {
      setFilter('All');
    }
  }, [filter, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePin = async (post) => {
    await togglePin(post.id, post.pinned === 0);
    load();
  };

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      backgroundColor: theme.headerBg,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: theme.rule,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    appName: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.headerText,
      fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif',
      letterSpacing: -0.5,
    },
    headerActions: { flexDirection: 'row', gap: 14 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginTop: 10,
      height: 38,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      marginLeft: 6,
    },
    filterRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    filterScrollContent: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignSelf: 'flex-start',
    },
    filterChipActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: theme.textSecondary,
    },
    filterChipTextActive: {
      color: theme.accentText,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
    emptyTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center', fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif' },
    emptyBody: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
    dateRule: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 8,
      gap: 10,
    },
    dateLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dateText: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textSecondary },
  });

  const renderHeader = () => (
    <View>
      <View style={s.dateRule}>
        <View style={s.dateLine} />
        <Text style={s.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <View style={s.dateLine} />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <Text style={{ fontSize: 60, marginBottom: 16 }}>✦</Text>
      <Text style={s.emptyTitle}>The page awaits</Text>
      <Text style={s.emptyBody}>
        {filter !== 'All'
          ? `No ${filter} posts yet. Tap + to write your first.`
          : "You haven't written anything yet.\nTap + to begin your Chronicle."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.appName}>Chronicle</Text>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={() => { setSearching(!searching); if (searching) setSearch(''); }}>
              <Ionicons name={searching ? 'close' : 'search'} size={22} color={theme.headerText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Themes')}>
              <Ionicons name="color-palette-outline" size={22} color={theme.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        {searching && (
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search posts…"
              placeholderTextColor={theme.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={load}
            />
          </View>
        )}
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScrollContent}
        >
          {['All', ...categories].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.filterChip, filter === cat && s.filterChipActive]}
              onPress={() => setFilter(cat)}
            >
              <Text style={[s.filterChipText, filter === cat && s.filterChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            theme={theme}
            index={index}
            onPress={() => navigation.navigate('Post', { id: item.id })}
            onPin={() => handlePin(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('Compose', {})} activeOpacity={0.85}>
        <Ionicons name="create-outline" size={26} color={theme.accentText} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    padding: 18,
    borderRadius: 2,
  },
  featureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2 },
  categoryText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  featureHeadline: { fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 6 },
  featureDeck: { fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginBottom: 8 },
  featurePreview: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, letterSpacing: 0.3 },
  metaDot: { fontSize: 11 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listCardLeft: { flex: 1 },
  listCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categorySmall: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  listHeadline: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
  listMeta: { fontSize: 11 },
  pinBtn: { paddingLeft: 12 },
});
