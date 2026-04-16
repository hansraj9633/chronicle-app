// src/screens/PublishScreen.js — Phase 5
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../themes/ThemeContext';
import { getSetting, setSetting } from '../storage/db';
import { publishToMedium, publishToSubstack } from '../sharing/publishService';

function PlatformCard({ theme, icon, color, title, subtitle, children, helpUrl, helpLabel }) {
  const s = makeStyles(theme);

  return (
    <View style={[s.platformCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={s.platformHeader}>
        <View style={[s.platformIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.platformTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[s.platformSub, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
        {helpUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(helpUrl)} style={s.helpBtn}>
            <Text style={[s.helpBtnText, { color: color }]}>{helpLabel || 'Setup'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

export default function PublishScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { post } = route.params;

  const [mediumToken, setMediumToken] = useState('');
  const [substackUrl, setSubstackUrl] = useState('');
  const [loading, setLoading] = useState(null);
  const [results, setResults] = useState([]);
  const [showMediumToken, setShowMediumToken] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting('medium_token'),
      getSetting('substack_url'),
    ]).then(([mt, su]) => {
      if (mt) setMediumToken(mt);
      if (su) setSubstackUrl(su);
    });
  }, []);

  const saveMediumToken = async () => {
    await setSetting('medium_token', mediumToken);
  };

  const saveSubstackUrl = async () => {
    await setSetting('substack_url', substackUrl);
  };

  const handlePublishMedium = async () => {
    if (!mediumToken.trim()) {
      Alert.alert(
        'Medium Token Required',
        'Get your integration token at:\nmedium.com → Settings → Security → Integration Tokens\n\nPaste it in the field above.',
        [
          { text: 'Open Medium Settings', onPress: () => Linking.openURL('https://medium.com/me/settings') },
          { text: 'OK' },
        ]
      );
      return;
    }
    setLoading('medium');
    try {
      const result = await publishToMedium(post, mediumToken);
      setResults(prev => [{ ...result, at: new Date().toLocaleTimeString() }, ...prev]);
      Alert.alert(
        '✅ Published to Medium!',
        `Your post was saved as a draft on Medium.\n\nURL: ${result.url}`,
        [
          { text: 'Open on Medium', onPress: () => Linking.openURL(result.url) },
          { text: 'Done' },
        ]
      );
    } catch (e) {
      Alert.alert('Medium publish failed', e.message);
    } finally {
      setLoading(null);
    }
  };

  const handlePublishSubstack = async () => {
    setLoading('substack');
    try {
      const result = await publishToSubstack(post, { publicationUrl: substackUrl });
      const content = `${post.title}\n\n${post.deck ? post.deck + '\n\n' : ''}${post.body}`;
      await Clipboard.setStringAsync(content);
      Alert.alert(
        '📋 Content Copied!',
        `Your post content has been copied to clipboard.\n\nSubstack's composer will open — paste your content there.\n\n(Substack doesn't have a public write API yet.)`,
        [
          { text: 'Open Substack', onPress: () => Linking.openURL(result.url) },
          { text: 'Done' },
        ]
      );
    } catch (e) {
      Alert.alert('Substack publish failed', e.message);
    } finally {
      setLoading(null);
    }
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Publish</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">

        {/* Post summary */}
        <View style={[s.postCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
          <Text style={[s.postCategory, { color: theme.accent }]}>{post.category}</Text>
          <Text style={[s.postTitle, { color: theme.text }]} numberOfLines={2}>{post.title}</Text>
          <Text style={[s.postMeta, { color: theme.textSecondary }]}>
            {post.word_count} words · {post.read_time} min read
          </Text>
        </View>

        {/* Medium */}
        <PlatformCard
          theme={theme}
          icon="globe-outline"
          color="#00ab6c"
          title="Medium"
          subtitle="Publish as a draft to your Medium profile"
          helpUrl="https://medium.com/me/settings"
          helpLabel="Get Token"
        >
          <View style={[s.inputRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Ionicons name="key-outline" size={16} color={theme.textSecondary} />
            <TextInput
              style={[s.tokenInput, { color: theme.text }]}
              placeholder="Integration token…"
              placeholderTextColor={theme.textSecondary}
              value={mediumToken}
              onChangeText={setMediumToken}
              onBlur={saveMediumToken}
              secureTextEntry={!showMediumToken}
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={() => setShowMediumToken(v => !v)}>
              <Ionicons name={showMediumToken ? 'eye-off-outline' : 'eye-outline'} size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[s.publishBtn, { backgroundColor: '#00ab6c' }]}
            onPress={handlePublishMedium}
            disabled={!!loading}
            activeOpacity={0.8}
          >
            {loading === 'medium'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            }
            <Text style={s.publishBtnText}>
              {loading === 'medium' ? 'Publishing…' : 'Publish to Medium (as draft)'}
            </Text>
          </TouchableOpacity>
        </PlatformCard>

        {/* Substack */}
        <PlatformCard
          theme={theme}
          icon="mail-outline"
          color="#ff6719"
          title="Substack"
          subtitle="Copy content and open your Substack composer"
          helpUrl="https://substack.com"
          helpLabel="Open"
        >
          <View style={[s.inputRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
            <TextInput
              style={[s.tokenInput, { color: theme.text }]}
              placeholder="yourname.substack.com"
              placeholderTextColor={theme.textSecondary}
              value={substackUrl}
              onChangeText={setSubstackUrl}
              onBlur={saveSubstackUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              blurOnSubmit={false}
            />
          </View>
          <View style={[s.noteBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.noteText, { color: theme.textSecondary }]}>
              Substack doesn't have a public API. We'll copy your post to clipboard and open the composer.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.publishBtn, { backgroundColor: '#ff6719' }]}
            onPress={handlePublishSubstack}
            disabled={!!loading}
            activeOpacity={0.8}
          >
            {loading === 'substack'
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="copy-outline" size={18} color="#fff" />
            }
            <Text style={s.publishBtnText}>
              {loading === 'substack' ? 'Preparing…' : 'Copy & Open Substack'}
            </Text>
          </TouchableOpacity>
        </PlatformCard>

        {/* Publish history */}
        {results.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Published this session</Text>
            {results.map((r, i) => (
              <TouchableOpacity
                key={i}
                style={[s.resultRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => r.url && Linking.openURL(r.url)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#00ab6c" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultPlatform, { color: theme.text }]}>{r.platform} · {r.status}</Text>
                  <Text style={[s.resultTime, { color: theme.textSecondary }]}>{r.at}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            ))}
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
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.headerBg, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 2, borderBottomColor: theme.rule,
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: theme.headerText, fontFamily: 'serif' },
    postCard: {
      borderWidth: 1.5, borderRadius: 20, padding: 14, marginBottom: 18,
    },
    postCategory: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
    postTitle: { fontSize: 17, fontWeight: '900', fontFamily: 'serif', lineHeight: 22, marginBottom: 4 },
    postMeta: { fontSize: 11 },
    platformCard: {
      borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14,
    },
    platformHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    platformIcon: { width: 44, height: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    platformTitle: { fontSize: 16, fontWeight: '800' },
    platformSub: { fontSize: 12, marginTop: 1 },
    helpBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(128,128,128,0.1)' },
    helpBtnText: { fontSize: 11, fontWeight: '700' },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderRadius: 20, paddingHorizontal: 12,
      height: 44, marginBottom: 10,
    },
    tokenInput: { flex: 1, fontSize: 14, letterSpacing: 0.3 },
    noteBox: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      borderWidth: 1, borderRadius: 20, padding: 10, marginBottom: 10,
    },
    noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
    publishBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, borderRadius: 20, paddingVertical: 13,
    },
    publishBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    section: { marginTop: 8 },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', color: theme.textSecondary, marginBottom: 8,
    },
    resultRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderRadius: 4, padding: 12, marginBottom: 8,
    },
    resultPlatform: { fontSize: 14, fontWeight: '700' },
    resultTime: { fontSize: 11, marginTop: 2 },
  });
}