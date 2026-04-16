// src/screens/ShareScreen.js — Phase 4
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../themes/ThemeContext';
import { sharePostAsPDF } from '../sharing/pdfGenerator';
import { shareClipping } from '../sharing/clippingGenerator';
import {
  SOCIAL_PLATFORMS, shareAsPlainText, shareAsMarkdown,
  copyToClipboard,
} from '../sharing/socialShare';

const CLIPPING_STYLES = [
  { id: 'classic', label: 'Classic',  desc: 'Broadsheet newspaper cut',   emoji: '📰' },
  { id: 'torn',    label: 'Torn',     desc: 'Slightly rotated & worn',    emoji: '🗞️' },
  { id: 'modern',  label: 'Modern',   desc: 'Clean card with accent bar', emoji: '✨' },
];

export default function ShareScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { post } = route.params;
  const [loading, setLoading] = useState(null); // string key of what's loading
  const [clippingModalVisible, setClippingModalVisible] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');

  const doWithLoading = async (key, fn) => {
    setLoading(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Sharing failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const showCopied = (msg = 'Copied!') => {
    setCopiedMsg(msg);
    setTimeout(() => setCopiedMsg(''), 2000);
  };

  const s = makeStyles(theme);

  const SectionHeader = ({ title, subtitle }) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
  );

  const ActionRow = ({ icon, iconColor = theme.text, label, sublabel, onPress, loadKey, badge }) => (
    <TouchableOpacity
      style={[s.actionRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={!!loading}
    >
      <View style={[s.actionIconWrap, { backgroundColor: iconColor + '18' }]}>
        {loading === loadKey
          ? <ActivityIndicator size="small" color={iconColor} />
          : <Ionicons name={icon} size={22} color={iconColor} />
        }
      </View>
      <View style={s.actionText}>
        <Text style={[s.actionLabel, { color: theme.text }]}>{label}</Text>
        {sublabel && <Text style={[s.actionSub, { color: theme.textSecondary }]}>{sublabel}</Text>}
      </View>
      {badge && (
        <View style={[s.badge, { backgroundColor: theme.accent }]}>
          <Text style={[s.badgeText, { color: theme.accentText }]}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Share Entry</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Copied toast */}
      {!!copiedMsg && (
        <View style={[s.toast, { backgroundColor: theme.accent }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.accentText} />
          <Text style={[s.toastText, { color: theme.accentText }]}>{copiedMsg}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>

        {/* Post summary card */}
        <View style={[s.postCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
          <Text style={[s.postCategory, { color: theme.accent }]}>{post.category}</Text>
          <Text style={[s.postTitle, { color: theme.text }]} numberOfLines={2}>{post.title}</Text>
          {post.deck ? (
            <Text style={[s.postDeck, { color: theme.textSecondary }]} numberOfLines={1}>{post.deck}</Text>
          ) : null}
          <Text style={[s.postMeta, { color: theme.textSecondary }]}>
            {post.word_count} words · {post.read_time} min read
          </Text>
        </View>

        {/* ── PDF EXPORT ─────────────────────────── */}
        <SectionHeader title="📄 Export as PDF" subtitle="Fully themed, print-ready document" />
        <ActionRow
          icon="document-text-outline"
          iconColor={theme.accent}
          label="Share as PDF"
          sublabel="Themed newspaper layout, all content"
          loadKey="pdf"
          onPress={() => doWithLoading('pdf', () => sharePostAsPDF(post, theme))}
        />

        {/* ── NEWSPAPER CLIPPING ─────────────────── */}
        <SectionHeader title="✂️ Newspaper Clipping" subtitle="Share as a styled clipping image" />
        <ActionRow
          icon="newspaper-outline"
          iconColor="#8b1a1a"
          label="Classic clipping"
          sublabel="Traditional broadsheet cut-out"
          loadKey="clip-classic"
          onPress={() => doWithLoading('clip-classic', () => shareClipping(post, theme, 'classic'))}
        />
        <ActionRow
          icon="alert-circle-outline"
          iconColor="#7a5c3a"
          label="Torn clipping"
          sublabel="Worn, rotated, aged look"
          loadKey="clip-torn"
          onPress={() => doWithLoading('clip-torn', () => shareClipping(post, theme, 'torn'))}
        />
        <ActionRow
          icon="card-outline"
          iconColor="#1a1a2e"
          label="Modern card"
          sublabel="Clean minimal with accent header"
          loadKey="clip-modern"
          onPress={() => doWithLoading('clip-modern', () => shareClipping(post, theme, 'modern'))}
        />

        {/* ── SOCIAL MEDIA ───────────────────────── */}
        <SectionHeader title="📲 Social Media" subtitle="Post directly to your platforms" />
        <View style={s.socialGrid}>
          {SOCIAL_PLATFORMS.map(platform => (
            <TouchableOpacity
              key={platform.id}
              style={[s.socialBtn, { backgroundColor: platform.color + '15', borderColor: platform.color + '40' }]}
              onPress={() => doWithLoading(`social-${platform.id}`, () => platform.fn(post))}
              activeOpacity={0.75}
              disabled={!!loading}
            >
              {loading === `social-${platform.id}`
                ? <ActivityIndicator size="small" color={platform.color} />
                : <Ionicons name={platform.icon} size={26} color={platform.color} />
              }
              <Text style={[s.socialLabel, { color: platform.color }]}>{platform.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TEXT FORMATS ───────────────────────── */}
        <SectionHeader title="📋 Copy & Text" subtitle="Plain text and markdown formats" />
        <ActionRow
          icon="copy-outline"
          iconColor={theme.accent}
          label="Copy to clipboard"
          sublabel="Plain text, ready to paste anywhere"
          loadKey="copy"
          onPress={() => doWithLoading('copy', async () => {
            await copyToClipboard(post);
            showCopied('Copied to clipboard!');
          })}
        />
        <ActionRow
          icon="share-outline"
          iconColor={theme.text}
          label="Share as plain text"
          sublabel="Opens Android share sheet"
          loadKey="plain"
          onPress={() => doWithLoading('plain', () => shareAsPlainText(post))}
        />
        <ActionRow
          icon="code-slash-outline"
          iconColor="#2563eb"
          label="Share as Markdown"
          sublabel="Full formatting preserved"
          loadKey="md"
          onPress={() => doWithLoading('md', () => shareAsMarkdown(post))}
        />

        {/* ── PUBLISH ────────────────────────────── */}
        <SectionHeader title="🌐 Publish to Web" subtitle="Post directly to your blog platform" />
        <ActionRow
          icon="globe-outline"
          iconColor="#00ab6c"
          label="Publish to Medium or Substack"
          sublabel="Save as draft on Medium · Open Substack composer"
          loadKey="publish"
          onPress={() => navigation.navigate('Publish', { post })}
        />

        {/* ── COMING SOON ────────────────────────── */}
        <SectionHeader title="🔜 More coming soon" />
        {[
          // { icon: 'globe-outline',     label: 'Publish to Medium',    color: '#00ab6c' },
          // { icon: 'mail-outline',      label: 'Publish to Substack',  color: '#ff6719' },
          { icon: 'cloud-outline',     label: 'Save to Google Drive', color: '#4285F4' },
        ].map((item, i) => (
          <View key={i} style={[s.comingRow, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.6 }]}>
            <View style={[s.actionIconWrap, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={[s.actionLabel, { color: theme.textSecondary }]}>{item.label}</Text>
            <View style={[s.badge, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[s.badgeText, { color: theme.textSecondary }]}>Soon</Text>
            </View>
          </View>
        ))}

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
    headerTitle: { fontSize: 17, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    toast: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    toastText: { fontSize: 13, fontWeight: '700' },
    postCard: {
      borderWidth: 1.5, borderRadius: 20, padding: 16, marginBottom: 22,
    },
    postCategory: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
    postTitle: { fontSize: 18, fontWeight: '900', fontFamily: 'serif', lineHeight: 24, marginBottom: 4 },
    postDeck: { fontSize: 13, fontStyle: 'italic', marginBottom: 6 },
    postMeta: { fontSize: 11 },
    sectionHeader: { marginTop: 8, marginBottom: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.text, letterSpacing: 0.5 },
    sectionSub: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
    actionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 8,
    },
    actionIconWrap: {
      width: 44, height: 44, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
    },
    actionText: { flex: 1 },
    actionLabel: { fontSize: 15, fontWeight: '700' },
    actionSub: { fontSize: 12, marginTop: 1 },
    badge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 4,
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    socialGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
    },
    socialBtn: {
      width: '30%', aspectRatio: 1, borderWidth: 1, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10,
    },
    socialLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
    comingRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 8,
    },
  });
}
