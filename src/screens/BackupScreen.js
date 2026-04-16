// src/screens/BackupScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../themes/ThemeContext';
import { exportAllPosts, importPosts, getStats } from '../storage/db';

export default function BackupScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const posts = await exportAllPosts();
      const stats = await getStats();
      const backup = {
        app: 'Chronicle',
        version: '1.0',
        exported_at: new Date().toISOString(),
        stats,
        posts,
      };
      const json = JSON.stringify(backup, null, 2);
      const fileName = `chronicle-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your Chronicle backup',
        });
        setLastAction(`Exported ${posts.length} posts on ${new Date().toLocaleDateString()}`);
      } else {
        Alert.alert('Saved', `Backup saved to:\n${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMarkdown = async () => {
    setLoading(true);
    try {
      const posts = await exportAllPosts();
      let md = `# Chronicle Export\n_Exported ${new Date().toLocaleDateString()}_\n\n---\n\n`;
      for (const p of posts) {
        md += `# ${p.title}\n`;
        if (p.deck) md += `_${p.deck}_\n\n`;
        md += `**Category:** ${p.category} | **Date:** ${new Date(p.created_at).toLocaleDateString()} | **Words:** ${p.word_count}\n\n`;
        if (p.tags) md += `**Tags:** ${p.tags}\n\n`;
        md += `---\n\n${p.body}\n\n---\n\n`;
      }
      const fileName = `chronicle-export-${new Date().toISOString().slice(0, 10)}.md`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, md);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/markdown',
          dialogTitle: 'Save Markdown export',
        });
      }
    } catch (e) {
      Alert.alert('Export failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import from backup',
      'Paste your backup JSON content. In the full version, a file picker will be available here.\n\nFor now, place your chronicle-backup.json file in the app\'s document directory and it will be read.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Read from Documents',
          onPress: async () => {
            setLoading(true);
            try {
              const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
              const backupFile = files.find(f => f.startsWith('chronicle-backup') && f.endsWith('.json'));
              if (!backupFile) {
                Alert.alert('No backup found', 'Place a chronicle-backup-*.json file in the app documents folder first.');
                setLoading(false);
                return;
              }
              const raw = await FileSystem.readAsStringAsync(FileSystem.documentDirectory + backupFile);
              const data = JSON.parse(raw);
              if (!data.posts || !Array.isArray(data.posts)) throw new Error('Invalid backup format');
              await importPosts(data.posts);
              setLastAction(`Imported ${data.posts.length} posts from ${backupFile}`);
              Alert.alert('Import complete!', `${data.posts.length} posts have been restored.`);
            } catch (e) {
              Alert.alert('Import failed', e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const s = makeStyles(theme);

  const ActionCard = ({ icon, title, description, onPress, accent = false }) => (
    <TouchableOpacity
      style={[s.actionCard, { backgroundColor: theme.card, borderColor: accent ? theme.accent : theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      <View style={[s.actionIcon, { backgroundColor: accent ? theme.accent : theme.surface }]}>
        <Ionicons name={icon} size={24} color={accent ? theme.accentText : theme.text} />
      </View>
      <View style={s.actionText}>
        <Text style={[s.actionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[s.actionDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Backup & Restore</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading && (
        <View style={s.loadingBar}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[s.loadingText, { color: theme.textSecondary }]}>Working…</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

        <View style={[s.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={[s.infoText, { color: theme.textSecondary }]}>
            Your Chronicle stores data on your device. Export regularly to keep your writing safe.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Export</Text>
        <ActionCard
          icon="cloud-download-outline"
          title="Export as JSON backup"
          description="Full backup — re-importable into Chronicle"
          onPress={handleExport}
          accent
        />
        <ActionCard
          icon="document-text-outline"
          title="Export as Markdown"
          description="All posts as a single .md file"
          onPress={handleExportMarkdown}
        />

        <Text style={s.sectionTitle}>Restore</Text>
        <ActionCard
          icon="cloud-upload-outline"
          title="Import from backup"
          description="Restore from a JSON backup file"
          onPress={handleImport}
        />

        {lastAction && (
          <View style={[s.successBanner, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.accent} />
            <Text style={[s.successText, { color: theme.text }]}>{lastAction}</Text>
          </View>
        )}

        <View style={[s.noteBox, { borderColor: theme.border }]}>
          <Text style={s.noteTitle}>📌 Coming in Phase 5</Text>
          <Text style={[s.noteBody, { color: theme.textSecondary }]}>
            • Auto-backup to Google Drive{'\n'}
            • iCloud sync{'\n'}
            • Scheduled backup reminders{'\n'}
            • Selective post restore
          </Text>
        </View>

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
    loadingBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 18, paddingVertical: 8,
      backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    loadingText: { fontSize: 13 },
    infoBox: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 24,
    },
    infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
    sectionTitle: {
      fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
      textTransform: 'uppercase', color: theme.textSecondary,
      marginBottom: 10, marginTop: 4,
    },
    actionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 10,
    },
    actionIcon: {
      width: 46, height: 46, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    actionText: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    actionDesc: { fontSize: 12, lineHeight: 18 },
    successBanner: {
      flexDirection: 'row', gap: 10, alignItems: 'center',
      borderWidth: 1, borderRadius: 20, padding: 14, marginTop: 16,
    },
    successText: { flex: 1, fontSize: 13 },
    noteBox: {
      borderWidth: 1, borderRadius:20, padding: 16,
      marginTop: 24, borderStyle: 'dashed',
    },
    noteTitle: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 },
    noteBody: { fontSize: 13, lineHeight: 22 },
  });
}
