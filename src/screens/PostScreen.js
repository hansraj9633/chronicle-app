// src/screens/PostScreen.js — Phase 2: Rich rendering
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../themes/ThemeContext';
import { getPost, deletePost, togglePin, getSetting } from '../storage/db';
import MarkdownRenderer from '../components/MarkdownRenderer';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function PostScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [post, setPost] = useState(null);
  const [fontSize, setFontSize] = useState(17);

  useFocusEffect(useCallback(() => {
    getPost(route.params.id).then(setPost);
    getSetting('font_size').then(v => { if (v) setFontSize(parseInt(v)); });
  }, [route.params.id]));

  if (!post) return null;

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'This will permanently remove this post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deletePost(post.id); navigation.goBack(); },
      },
    ]);
  };

  const handleShare = () => {
    navigation.navigate('Share', { post });
  };

  const handlePin = async () => {
    await togglePin(post.id, post.pinned === 0);
    getPost(post.id).then(setPost);
  };

  const s = makeStyles(theme, fontSize);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <View style={s.topActions}>
          <TouchableOpacity onPress={handlePin} style={s.topBtn}>
            <Ionicons name={post.pinned ? 'bookmark' : 'bookmark-outline'} size={22} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.topBtn}>
            <Ionicons name="share-outline" size={22} color={theme.headerText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Compose', { id: post.id })} style={s.topBtn}>
            <Ionicons name="create-outline" size={22} color={theme.headerText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={s.topBtn}>
            <Ionicons name="trash-outline" size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Category & badges */}
        <View style={s.categoryRow}>
          <View style={[s.badge, { borderColor: theme.accent }]}>
            <Text style={[s.badgeText, { color: theme.accent }]}>{post.category}</Text>
          </View>
          {post.status === 'draft' && (
            <View style={[s.badge, { borderColor: theme.textSecondary }]}>
              <Text style={[s.badgeText, { color: theme.textSecondary }]}>Draft</Text>
            </View>
          )}
          {post.pinned === 1 && (
            <Ionicons name="bookmark" size={14} color={theme.accent} />
          )}
        </View>

        {/* Headline */}
        <Text style={s.headline}>{post.title}</Text>

        {/* Deck */}
        {post.deck ? <Text style={s.deck}>{post.deck}</Text> : null}

        {/* Double rule — newspaper style */}
        <View style={s.doubleRule}>
          <View style={[s.ruleLine, { backgroundColor: theme.rule }]} />
          <View style={{ height: 3 }} />
          <View style={[s.ruleLine, { backgroundColor: theme.rule, height: 1 }]} />
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <Text style={s.meta}>{formatDate(post.created_at)}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.meta}>{post.word_count} words</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.meta}>{post.read_time} min read</Text>
        </View>

        {/* Tags */}
        {post.tags ? (
          <View style={s.tagsRow}>
            {post.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <View key={tag} style={[s.tag, { borderColor: theme.border }]}>
                <Text style={[s.tagText, { color: theme.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[s.ruleLine, { backgroundColor: theme.border, marginBottom: 20 }]} />

        {/* Rich body */}
        <MarkdownRenderer text={post.body} fontSize={fontSize} />

        {/* Bottom actions */}
        <View style={s.bottomRow}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.accent, flex: 2 }]} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={theme.accent} />
            <Text style={[s.actionBtnText, { color: theme.accent }]}>Share & Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.border }]} onPress={() => navigation.navigate('Compose', { id: post.id })}>
            <Ionicons name="create-outline" size={18} color={theme.text} />
            <Text style={[s.actionBtnText, { color: theme.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: '#c9a0a0' }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.accent} />
            <Text style={[s.actionBtnText, { color: theme.accent }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Updated date */}
        {post.updated_at !== post.created_at && (
          <Text style={[s.updatedText, { color: theme.textSecondary }]}>
            Last edited {formatDate(post.updated_at)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme, fontSize) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.headerBg, paddingHorizontal: 10, paddingVertical: 8,
      borderBottomWidth: 2, borderBottomColor: theme.rule,
    },
    topBtn: { padding: 6 },
    topActions: { flexDirection: 'row', gap: 2 },
    scroll: { flex: 1 },
    content: { padding: 22, paddingBottom: 60 },
    categoryRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
    badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
    headline: {
      fontSize: Math.min(32, fontSize * 1.8),
      fontWeight: '900', color: theme.text,
      fontFamily: theme.titleFont === 'monospace' ? 'monospace' : 'serif',
      lineHeight: Math.min(40, fontSize * 2.2),
      marginBottom: 10,
    },
    deck: {
      fontSize: fontSize * 0.95,
      fontStyle: 'italic', color: theme.textSecondary,
      lineHeight: fontSize * 1.6, marginBottom: 14,
    },
    doubleRule: { marginVertical: 12 },
    ruleLine: { height: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    meta: { fontSize: 12, color: theme.textSecondary, letterSpacing: 0.3 },
    metaDot: { fontSize: 12, color: theme.border },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    tag: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
    tagText: { fontSize: 11, letterSpacing: 0.5 },
    bottomRow: {
      flexDirection: 'row', gap: 10, marginTop: 40,
      paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border,
    },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 5, borderWidth: 1, paddingVertical: 10, borderRadius: 20,
    },
    actionBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    updatedText: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  });
}
